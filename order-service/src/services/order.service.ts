import type { OrderModel, Order, OrderStatus } from "../models/order.model.ts";
import type { CreateOrderInput } from "../schemas/order.schema.ts";
import type { createServiceClients } from "./clients.ts";

export function createOrderService(model: typeof OrderModel, clients: ReturnType<typeof createServiceClients>) {
    return {
        async createOrder(requesterId: string, input: CreateOrderInput, cookie: string): Promise<Order> {
            // Validate needed-by time is not in the past
            const neededTime = new Date(input.neededByTime);
            if (neededTime <= new Date()) {
                throw new Error("NEEDED_BY_TIME_IN_PAST");
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
                const opened = await model.updateStatus(newOrder.id, "Open", "Pending");
                if (!opened) throw new Error("ORDER_CREATION_FAILED");
                return opened;
            } catch (error) {
                // A timed-out reservation may still succeed remotely. The durable release uses
                // the same errand reference and is retried without storing the session cookie.
                await model.updateStatus(newOrder.id, "Cancelled", "Pending");
                throw error;
            }
        },

        async getOpenRequests(): Promise<Order[]> {
            return await model.findOpenRequests();
        },

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

            if (order.status !== "Open") {
                throw new Error("ORDER_NOT_AVAILABLE");
            }

            const updatedOrder = await model.acceptOrder(orderId, courierId);
            if (!updatedOrder) throw new Error("ORDER_ACCEPTANCE_FAILED");

            return updatedOrder;
        },

        async updateOrderStatus(orderId: number, userId: string, newStatus: OrderStatus): Promise<Order> {
            const order = await model.findById(orderId);
            if (!order) throw new Error("ORDER_NOT_FOUND");

            if (["PickedUp", "Delivered"].includes(newStatus) && order.courier_id !== userId) {
                throw new Error("UNAUTHORIZED_COURIER_ACTION");
            }
            if (["Completed", "Cancelled", "Expired"].includes(newStatus) && order.requester_id !== userId) {
                throw new Error("UNAUTHORIZED_REQUESTER_ACTION");
            }
            if (["Completed", "Cancelled", "Expired"].includes(newStatus) && order.status === newStatus) return order;

            // Acceptance has its own atomic operation, which also assigns the courier.
            const current = order.status;
            const isValidTransition =
                (current === "Open" && ["Cancelled", "Expired"].includes(newStatus)) ||
                (current === "Accepted" && ["PickedUp", "Cancelled"].includes(newStatus)) ||
                (current === "PickedUp" && newStatus === "Delivered") ||
                (current === "Delivered" && newStatus === "Completed");

            if (!isValidTransition) {
                throw new Error("INVALID_STATE_TRANSITION");
            }

            const updated = await model.updateStatus(orderId, newStatus, current);
            if (!updated) throw new Error("STATUS_UPDATE_FAILED");

            return updated;
        }
    };
}
