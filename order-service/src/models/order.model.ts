import { pool } from "../db.ts";
import type { QueryResult } from "pg";

export type OrderStatus =
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
            VALUES ($1, $2, $3, $4, $5::text[], $6, 'Open')
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

    async acceptOrder(orderId: number, courierId: string): Promise<Order | null> {
        const query = `
            UPDATE orders
            SET courier_id = $1, status = 'Accepted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'Open' AND requester_id != $1
            RETURNING *;
        `;
        const result: QueryResult<Order> = await pool.query(query, [courierId, orderId]);
        return result.rows[0] || null;
    },

    async updateStatus(orderId: number, status: OrderStatus): Promise<Order | null> {
        const query = `
            UPDATE orders
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;
        const result: QueryResult<Order> = await pool.query(query, [status, orderId]);
        return result.rows[0] || null;
    }
};