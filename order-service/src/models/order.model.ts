import { pool } from "../db.ts";
import type { QueryResult } from "pg";

export type OrderStatus =
    | "Pending"
    | "Open"
    | "Accepted"
    | "PickedUp"
    | "Delivered"
    | "Completed"
    | "Cancelled"
    | "Expired";

export interface Order {
    id: number;
    requester_id: string;
    courier_id: string | null;
    supplier_id: string;
    delivery_location: string;
    needed_by_time: Date;
    item_lines: string[];
    credit_reward: number;
    status: OrderStatus;
    created_at: Date;
    updated_at: Date;
}

export interface OrderTransition {
    from_status: OrderStatus;
    to_status: OrderStatus;
    actor: string;
    occurred_at: Date;
}

export interface OrderWithHistory extends Order {
    transitions: OrderTransition[];
}

export interface CreateOrderData {
    requesterId: string;
    supplierId: string;
    deliveryLocation: string;
    neededByTime: string;
    itemLines: string[];
    creditReward: number;
}

export const OrderModel = {
    async create(data: CreateOrderData): Promise<Order> {
        const query = `
            INSERT INTO orders (
                requester_id, supplier_id, delivery_location,
                needed_by_time, item_lines, credit_reward, status
            )
            VALUES ($1, $2, $3, $4, $5::text[], $6, 'Pending')
            RETURNING *;
        `;
        const values = [
            data.requesterId,
            data.supplierId,
            data.deliveryLocation,
            data.neededByTime,
            data.itemLines,
            data.creditReward
        ];
        const result: QueryResult<Order> = await pool.query(query, values);
        return result.rows[0];
    },

    async findOpenRequests(): Promise<Order[]> {
        const result: QueryResult<Order> = await pool.query(`SELECT * FROM orders WHERE status = 'Open' ORDER BY created_at DESC;`);
        return result.rows;
    },

    async findById(id: number): Promise<Order | null> {
        const result: QueryResult<Order> = await pool.query(`SELECT * FROM orders WHERE id = $1;`, [id]);
        return result.rows[0] || null;
    },

    // F3.3.6: oldest first, so the list reads as the errand's history.
    async findTransitions(orderId: number): Promise<OrderTransition[]> {
        const result: QueryResult<OrderTransition> = await pool.query(`
            SELECT from_status, to_status, actor, occurred_at FROM order_transitions
            WHERE order_id = $1 ORDER BY occurred_at, id;
        `, [orderId]);
        return result.rows;
    },

    // Pending orders are still waiting for their credit reservation and are not errands yet.
    async findByParticipant(accountId: string): Promise<OrderWithHistory[]> {
        const result: QueryResult<OrderWithHistory> = await pool.query(`
            SELECT o.*, COALESCE(t.transitions, '[]'::json) AS transitions
            FROM orders o
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object(
                    'from_status', from_status, 'to_status', to_status,
                    'actor', actor, 'occurred_at', occurred_at
                ) ORDER BY occurred_at, id) AS transitions
                FROM order_transitions WHERE order_id = o.id
            ) t ON true
            WHERE (o.requester_id = $1 OR o.courier_id = $1) AND o.status <> 'Pending'
            ORDER BY o.created_at DESC, o.id DESC;
        `, [accountId]);
        return result.rows;
    },

    // The transition row is written in the same statement as the change, so a change
    // without its record (or the reverse) cannot happen.
    async acceptOrder(orderId: number, courierId: string): Promise<Order | null> {
        const query = `
            WITH updated AS (
                UPDATE orders
                SET courier_id = $1, status = 'Accepted', updated_at = now()
                WHERE id = $2 AND status = 'Open' AND requester_id != $1
                RETURNING *
            ), logged AS (
                INSERT INTO order_transitions (order_id, from_status, to_status, actor)
                SELECT id, 'Open', status, $1 FROM updated
            )
            SELECT * FROM updated;
        `;
        const result: QueryResult<Order> = await pool.query(query, [courierId, orderId]);
        return result.rows[0] || null;
    },

    async updateStatus(orderId: number, status: OrderStatus, expectedStatus: OrderStatus, actor: string): Promise<Order | null> {
        const query = `
            WITH updated AS (
                UPDATE orders
                SET status = $1, updated_at = now()
                WHERE id = $2 AND status = $3
                RETURNING *
            ), logged AS (
                INSERT INTO order_transitions (order_id, from_status, to_status, actor)
                SELECT id, $3, status, $4 FROM updated
            ), queued AS (
                INSERT INTO order_outbox (type, data)
                SELECT 'order.errand.' || lower(status),
                    jsonb_build_object('errandRef', id::text, 'courierId', courier_id)
                FROM updated WHERE status IN ('Completed', 'Cancelled', 'Expired')
            )
            SELECT * FROM updated;
        `;
        const result: QueryResult<Order> = await pool.query(query, [status, orderId, expectedStatus, actor]);
        return result.rows[0] || null;
    }
};