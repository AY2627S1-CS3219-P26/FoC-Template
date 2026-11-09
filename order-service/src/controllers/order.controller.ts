import type { Request, Response } from "express";
import { createOrderService } from "../services/order.service.ts";
import { CreateOrderSchema } from "../schemas/order.schema.ts";
import { OrderModel } from "../models/order.model.ts";
import { createServiceClients, ServiceError } from "../services/clients.ts";
import { config } from "../config.ts";

const OrderService = createOrderService(OrderModel, createServiceClients(config.SUPPLIER_SERVICE_URL, config.CREDIT_SERVICE_URL));

export const OrderController = {
    // POST /orders
    async createOrder(req: Request, res: Response): Promise<void> {
        try {
            // Extract logged-in user ID (populated by authentication middleware)
            const requesterId = res.locals.accountId;
            if (!requesterId) {
                res.status(401).json({ error: "Unauthorized: Missing user identity" });
                return;
            }

            // Validate payload with Zod
            const validation = CreateOrderSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: "Invalid request payload", details: validation.error.format() });
                return;
            }

            const order = await OrderService.createOrder(requesterId, validation.data, req.headers.cookie!);
            res.status(201).json({ message: "Errand request created successfully", data: order });
        } catch (error: any) {
            if (error instanceof ServiceError) {
                res.status(error.status).json({ error: error.message });
                return;
            }
            if (error.message === "NEEDED_BY_TIME_IN_PAST") {
                res.status(400).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: "Failed to create order" });
        }
    },

    // GET /orders/open
    async getOpenRequests(_req: Request, res: Response): Promise<void> {
        try {
            const orders = await OrderService.getOpenRequests();
            res.status(200).json({ data: orders });
        } catch (error: any) {
            res.status(500).json({ error: "Failed to fetch open requests" });
        }
    },

    // GET /orders/mine - orders the caller requested or is delivering, plus the caller's account id
    async getMyOrders(_req: Request, res: Response): Promise<void> {
        try {
            const accountId = res.locals.accountId as string;
            const orders = await OrderService.getMyOrders(accountId);
            res.status(200).json({ data: orders, accountId });
        } catch (error: any) {
            res.status(500).json({ error: "Failed to fetch your orders" });
        }
    },

    // GET /orders/:id
    async getOrderById(req: Request, res: Response): Promise<void> {
        try {
            const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const orderId = parseInt(rawId ?? "", 10);
            if (isNaN(orderId)) {
                res.status(400).json({ error: "Invalid order ID" });
                return;
            }

            const order = await OrderService.getOrderById(orderId);
            res.status(200).json({ data: order });
        } catch (error: any) {
            if (error.message === "ORDER_NOT_FOUND") {
                res.status(404).json({ error: "Order not found" });
                return;
            }
            res.status(500).json({ error: "Failed to fetch order" });
        }
    },

    // POST /orders/:id/accept
    async acceptOrder(req: Request, res: Response): Promise<void> {
        try {
            const courierId = res.locals.accountId;
            if (!courierId) {
                res.status(401).json({ error: "Unauthorized: Missing courier identity" });
                return;
            }

            const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const orderId = parseInt(rawId ?? "", 10);
            if (isNaN(orderId)) {
                res.status(400).json({ error: "Invalid order ID" });
                return;
            }

            const updatedOrder = await OrderService.acceptOrder(orderId, courierId as string);
            res.status(200).json({ message: "Order accepted successfully", data: updatedOrder });
        } catch (error: any) {
            switch (error.message) {
                case "ORDER_NOT_FOUND":
                    res.status(404).json({ error: "Order not found" });
                    break;
                case "REQUESTER_CANNOT_ACCEPT_OWN_ORDER":
                    res.status(403).json({ error: "You cannot accept your own errand request" });
                    break;
                case "ORDER_NOT_AVAILABLE":
                case "ORDER_ACCEPTANCE_FAILED":
                    res.status(409).json({ error: "Order is no longer available or was already accepted by another courier" });
                    break;
                default:
                    res.status(500).json({ error: "Failed to accept order" });
            }
        }
    },

    // PATCH /orders/:id/status
    async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = res.locals.accountId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized: Missing user identity" });
                return;
            }
            const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const orderId = parseInt(rawId ?? "", 10);
            const { status } = req.body;

            if (isNaN(orderId) || !status) {
                res.status(400).json({ error: "Order ID and status are required" });
                return;
            }

            const updatedOrder = await OrderService.updateOrderStatus(orderId, userId as string, status);
            res.status(200).json({ message: "Order status updated successfully", data: updatedOrder });
        } catch (error: any) {
            if (error.message.startsWith("UNAUTHORIZED_")) {
                res.status(403).json({ error: "You are not authorized to update this order" });
                return;
            }
            if (error.message === "ORDER_NOT_FOUND") {
                res.status(404).json({ error: "Order not found" });
                return;
            }
            if (["INVALID_STATE_TRANSITION", "STATUS_UPDATE_FAILED"].includes(error.message)) {
                res.status(409).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: "Failed to update order status" });
        }
    }
};
