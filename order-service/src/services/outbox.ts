import type { Event } from "../broker.ts";

type Database = { query(sql: string, values?: unknown[]): Promise<{ rows: any[] }> };

// An errand nobody accepted by its needed-by time is of no use any more, so its reward is released.
export async function expireOverdueOrders(db: Database): Promise<void> {
    await db.query(`
        WITH expired AS (
            UPDATE orders SET status = 'Expired', updated_at = now()
            WHERE status = 'Open' AND needed_by_time <= now()
            RETURNING id
        ), logged AS (
            INSERT INTO order_transitions (order_id, from_status, to_status, actor)
            SELECT id, 'Open', 'Expired', 'system' FROM expired
        )
        INSERT INTO order_outbox (type, data)
        SELECT 'order.errand.expired', jsonb_build_object('errandRef', id::text)
        FROM expired;
    `);
}

export async function relayOutbox(db: Database, publish: (event: Event) => Promise<void>): Promise<void> {
    await expireOverdueOrders(db);

    // A crash during reservation leaves a Pending order. Cancel it and release any
    // remote reservation without needing to keep the user's session credentials.
    await db.query(`
        WITH cancelled AS (
            UPDATE orders SET status = 'Cancelled', updated_at = now()
            WHERE status = 'Pending' AND created_at < now() - interval '1 minute'
            RETURNING id
        ), logged AS (
            INSERT INTO order_transitions (order_id, from_status, to_status, actor)
            SELECT id, 'Pending', 'Cancelled', 'system' FROM cancelled
        )
        INSERT INTO order_outbox (type, data)
        SELECT 'order.errand.cancelled', jsonb_build_object('errandRef', id::text)
        FROM cancelled;
    `);
    const { rows } = await db.query(`
        SELECT event_id, type, data, occurred_at FROM order_outbox
        WHERE sent_at IS NULL ORDER BY occurred_at LIMIT 50;
    `);
    for (const row of rows) {
        await publish({ eventId: row.event_id, type: row.type, data: row.data, occurredAt: row.occurred_at.toISOString() });
        await db.query("UPDATE order_outbox SET sent_at = now() WHERE event_id = $1", [row.event_id]);
    }
}

export function startOutboxRelay(db: Database, publish: (event: Event) => Promise<void>, onError: (error: unknown) => void) {
    let stopped = false;
    let timer: NodeJS.Timeout;
    let active: Promise<void> = Promise.resolve();
    const pass = async () => {
        try {
            await relayOutbox(db, publish);
        } catch (error) {
            onError(error);
        }
        if (!stopped) timer = setTimeout(() => { active = pass(); }, 1000);
    };
    active = pass();
    return async () => {
        stopped = true;
        clearTimeout(timer);
        await active;
    };
}
