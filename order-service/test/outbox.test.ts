import assert from "node:assert/strict";
import { test } from "node:test";
import { relayOutbox } from "../src/services/outbox.ts";

test("an outbox failure leaves the event pending, and a retry preserves its identity", async () => {
    let sent = false;
    const event = { event_id: "e-42", type: "order.errand.completed", occurred_at: new Date("2026-10-23T04:00:00.000Z"),
        data: { errandRef: "42", courierId: "courier" } };
    const db = { async query(sql: string) {
        if (sql.includes("SELECT")) return { rows: sent ? [] : [event] };
        if (sql.includes("SET sent_at")) sent = true;
        return { rows: [] };
    } };
    const attempts: unknown[] = [];
    await assert.rejects(relayOutbox(db, async (value) => { attempts.push(value); throw new Error("broker down"); }), /broker down/);
    assert.equal(sent, false);
    await relayOutbox(db, async (value) => { attempts.push(value); });
    assert.equal(sent, true);
    assert.deepEqual(attempts, [
        { eventId: "e-42", type: "order.errand.completed", occurredAt: "2026-10-23T04:00:00.000Z", data: { errandRef: "42", courierId: "courier" } },
        { eventId: "e-42", type: "order.errand.completed", occurredAt: "2026-10-23T04:00:00.000Z", data: { errandRef: "42", courierId: "courier" } },
    ]);
});

test("each relay pass first expires the errands nobody accepted by their needed-by time", async () => {
    const queries: string[] = [];
    const db = { async query(sql: string) { queries.push(sql); return { rows: [] }; } };
    await relayOutbox(db, async () => {});
    assert.match(queries[0], /SET status = 'Expired'[\s\S]*status = 'Open' AND needed_by_time <= now\(\)/);
    assert.match(queries[0], /'Open', 'Expired', 'system'/);
    assert.match(queries[0], /'order\.errand\.expired'/);
});
