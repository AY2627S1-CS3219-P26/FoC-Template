import type { OrderModel, Order, OrderStatus } from "../models/order.model.ts";
import type { CreateOrderInput } from "../schemas/order.schema.ts";
import { CreateOrderSchema } from "../schemas/order.schema.ts";
import { fieldErrorsOf, createError } from "../util/validation.ts";
import { AppError } from "../errors.ts";
import type { FieldErrors } from "../util/validation.ts";
import type { createServiceClients } from "./clients.ts";

export const SYSTEM_ACTOR = "system";

export type Role = "requester" | "courier";

// The transitions a participant may instruct, by current state. Open to Accepted goes through
// acceptOrder because it also assigns the courier; Open to Expired is only done by the system.
const USER_TRANSITIONS: Partial<Record<OrderStatus, { to: OrderStatus; by: Role }[]>> = {
    Open: [{ to: "Cancelled", by: "requester" }],
    Accepted: [{ to: "PickedUp", by: "courier" }, { to: "Cancelled", by: "requester" }],
    PickedUp: [{ to: "Delivered", by: "courier" }],
    Delivered: [{ to: "Completed", by: "requester" }],
};

function participantOf(order: Order, role: Role): string | null {
    return role === "requester" ? order.requester_id : order.courier_id;
}

export function allowedTransitions(order: Order, accountId: string): OrderStatus[] {
    return (USER_TRANSITIONS[order.status] ?? [])
        .filter((rule) => participantOf(order, rule.by) === accountId)
        .map((rule) => rule.to);
}

export function createOrderService(model: typeof OrderModel, clients: ReturnType<typeof createServiceClients>) {
    return {
        async createOrder(requesterId: string, input: CreateOrderInput, cookie: string): Promise<Order> {
            const parsed = CreateOrderSchema.safeParse(input);
        
            console.log(parsed.success)

            if (!parsed.success) {
                throw createError(fieldErrorsOf(parsed.error));
            }

            const validInput = parsed.data;

            // Validate needed-by time is not in the past
            const neededTime = new Date(input.neededByTime);
            if (neededTime <= new Date()) {
                throw createError({ neededByTime: ["Needed-by time must be in the future."] });
                //throw new Error("NEEDED_BY_TIME_IN_PAST");
            }

            await clients.checkSupplier(input.supplierId, input.neededByTime, cookie);
            const newOrder = await model.create({
                requesterId,
                supplierId: input.supplierId,
                deliveryLocation: input.deliveryLocation,
                neededByTime: input.neededByTime,
                itemLines: input.itemLines,
                creditReward: input.creditReward,
            });
            try {
                await clients.reserve(requesterId, String(newOrder.id), input.creditReward, cookie);
                const opened = await model.updateStatus(newOrder.id, "Open", "Pending", requesterId);
                if (!opened) throw new Error("ORDER_CREATION_FAILED");
                return opened;
            } catch (error) {
                // A timed-out reservation may still succeed remotely. The durable release uses
                // the same errand reference and is retried without storing the session cookie.
                await model.updateStatus(newOrder.id, "Cancelled", "Pending", SYSTEM_ACTOR);
                throw error;
            }
        },

        async getOpenRequests(): Promise<Order[]> {
            return await model.findOpenRequests();
        },

        // async getMyOrders(userId: string): Promise<Order[]> {
        //     return await model.findByUser(userId);
        // },

        async getOrderById(orderId: number): Promise<Order> {
            const order = await model.findById(orderId);
            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }
            return order;
        },

        async acceptOrder(orderId: number, courierId: string): Promise<Order> {
            const order = await model.findById(orderId);
            if (!order) throw new Error("ORDER_NOT_FOUND");

            if (order.requester_id === courierId) {
                throw new Error("REQUESTER_CANNOT_ACCEPT_OWN_ORDER");
            }

            if (order.status !== "Open" || new Date(order.needed_by_time) <= new Date()) {
                throw new Error("ORDER_NOT_AVAILABLE");
            }

            const updatedOrder = await model.acceptOrder(orderId, courierId);
            if (!updatedOrder) throw new Error("ORDER_ACCEPTANCE_FAILED");

            return updatedOrder;
        },

        async getMyOrders(accountId: string) {
            const orders = await model.findByParticipant(accountId);
            return orders.map((order) => ({
                ...order,
                role: (order.requester_id === accountId ? "requester" : "courier") as Role,
                allowed_transitions: allowedTransitions(order, accountId),
            }));
        },

        async updateOrderStatus(orderId: number, userId: string, newStatus: OrderStatus): Promise<Order> {
            const order = await model.findById(orderId);
            if (!order) throw new Error("ORDER_NOT_FOUND");

            // A repeated confirmation or cancellation answers with the unchanged errand.
            if (order.status === newStatus && ["Completed", "Cancelled"].includes(newStatus) && order.requester_id === userId) {
                return order;
            }

            const current = order.status;
            const rule = USER_TRANSITIONS[current]?.find((candidate) => candidate.to === newStatus);
            if (!rule) throw new Error("INVALID_STATE_TRANSITION");
            if (participantOf(order, rule.by) !== userId) throw new Error("UNAUTHORIZED_ACTION");

            const updated = await model.updateStatus(orderId, newStatus, current, userId);
            if (!updated) throw new Error("STATUS_UPDATE_FAILED");

            return updated;
        }
    };
}
