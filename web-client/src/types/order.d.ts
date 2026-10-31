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
