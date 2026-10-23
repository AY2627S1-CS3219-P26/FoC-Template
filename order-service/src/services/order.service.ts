import { OrderModel, Order, OrderStatus } from "../models/order.model.js";
import { CreateOrderInput } from "../schemas/order.schema.js";

export const OrderService = {
    async createOrder(requesterId: string, input: CreateOrderInput): Promise<Order> {
        // Validate needed-by time is not in the past
        const neededTime = new Date(input.neededByTime);
        if (neededTime <= new Date()) {
            throw new Error("NEEDED_BY_TIME_IN_PAST");
        }

        const newOrder = await OrderModel.create({
            requesterId,
            supplierId: input.supplierId,
            deliveryLocation: input.deliveryLocation,
            neededByTime: input.neededByTime,
            itemLines: input.itemLines,
            creditReward: input.creditReward,
        });
        return newOrder;
    },

    async getOpenRequests(): Promise<Order[]> {
        return await OrderModel.findOpenRequests();
    },

    async getOrderById(orderId: number): Promise<Order> {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }
        return order;
    },

    async acceptOrder(orderId: number, courierId: string): Promise<Order> {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error("ORDER_NOT_FOUND");

        if (order.requester_id === courierId) {
            throw new Error("REQUESTER_CANNOT_ACCEPT_OWN_ORDER");
        }

        if (order.status !== "Open") {
            throw new Error("ORDER_NOT_AVAILABLE");
        }

        const updatedOrder = await OrderModel.acceptOrder(orderId, courierId);
        if (!updatedOrder) throw new Error("ORDER_ACCEPTANCE_FAILED");

        return updatedOrder;
    },

    async updateOrderStatus(orderId: number, userId: string, newStatus: OrderStatus): Promise<Order> {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error("ORDER_NOT_FOUND");

        // Enforce F3.3.1 state transition rules
        const current = order.status;
        const isValidTransition =
            (current === "Open" && ["Accepted", "Cancelled", "Expired"].includes(newStatus)) ||
            (current === "Accepted" && ["PickedUp", "Cancelled"].includes(newStatus)) ||
            (current === "PickedUp" && newStatus === "Delivered") ||
            (current === "Delivered" && newStatus === "Completed");

        if (!isValidTransition) {
            throw new Error("INVALID_STATE_TRANSITION");
        }

        // Role restrictions (Courier vs Requester)
        if (newStatus === "PickedUp" || newStatus === "Delivered") {
            if (order.courier_id !== userId) throw new Error("UNAUTHORIZED_COURIER_ACTION");
        }
        if (newStatus === "Completed") {
            if (order.requester_id !== userId) throw new Error("UNAUTHORIZED_REQUESTER_ACTION");
        }

        const updated = await OrderModel.updateStatus(orderId, newStatus);
        if (!updated) throw new Error("STATUS_UPDATE_FAILED");

        return updated;
    }
};