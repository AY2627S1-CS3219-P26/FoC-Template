import type { Request, Response } from "express";
import { createOrderService } from "../services/order.service.ts";
import { OrderModel } from "../models/order.model.ts";
import { createServiceClients, ServiceError } from "../services/clients.ts";
import { config } from "../config.ts";
import { AppError } from "../errors.ts";

const OrderService = createOrderService(OrderModel, createServiceClients(config.SUPPLIER_SERVICE_URL, config.CREDIT_SERVICE_URL));

function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
    res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
}
const KNOWN_ERRORS: Record<string, [number, string]> = {
    ORDER_NOT_FOUND: [404, "Order not found"],
    REQUESTER_CANNOT_ACCEPT_OWN_ORDER: [403, "You cannot accept your own errand request"],
    ORDER_NOT_AVAILABLE: [409, "Order is no longer available or was already accepted by another courier"],
    ORDER_ACCEPTANCE_FAILED: [409, "Order is no longer available or was already accepted by another courier"],
    INVALID_STATE_TRANSITION: [409, "That status change is not allowed for this errand right now"],
    STATUS_UPDATE_FAILED: [409, "The errand changed in the meantime. Please refresh"],
    UNAUTHORIZED_ACTION: [403, "You are not authorized to update this order"],
};

function handleError(res: Response, error: any, fallback: string): void {
    if (error instanceof AppError) {
        sendError(res, error.status, error.code, error.message, error.details);
        return;
    }
    if (error instanceof ServiceError) {
        // ServiceError carries the code in its message (e.g. SUPPLIER_NOT_ORDERABLE).
        sendError(res, error.status, error.message, error.message);
        return;
    }
    const known = KNOWN_ERRORS[error?.message];
    if (known) {
        sendError(res, known[0], error.message, known[1]);
        return;
    }
    sendError(res, 500, "INTERNAL_ERROR", fallback);
}

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
            // const validation = CreateOrderSchema.safeParse(req.body);
            // if (!validation.success) {
            //     res.status(400).json({ error: "Invalid request payload", details: validation.error.format() });
            //     return;
            // }

            const order = await OrderService.createOrder(requesterId, req.body, req.headers.cookie!);
            res.status(201).json({ message: "Errand request created successfully", data: order });
        } catch (error: any) {
            handleError(res, error, "Failed to create order");
        }
    },

    // GET /orders/open
    async getOpenRequests(_req: Request, res: Response): Promise<void> {
        try {
            const orders = await OrderService.getOpenRequests();
            res.status(200).json({ data: orders });
        } catch (error: any) {
            handleError(res, error, "Failed to fetch open requests");
        }
    },

    // GET /orders/mine
    async getMyOrders(_req: Request, res: Response): Promise<void> {
        try {
            const accountId = res.locals.accountId as string;
            const orders = await OrderService.getMyOrders(accountId);
            res.status(200).json({ data: orders, accountId });
        } catch (error: any) {
            handleError(res, error, "Failed to fetch your orders");
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
            handleError(res, error, "Failed to fetch order");
        }
    },

    // POST /orders/:id/accept
    async acceptOrder(req: Request, res: Response): Promise<void> {
        try {
            const courierId = res.locals.accountId;
            if (!courierId) {
                sendError(res, 401, "UNAUTHENTICATED", "Unauthorized: Missing courier identity");
                return;
            }

            const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const orderId = parseInt(rawId ?? "", 10);
            if (isNaN(orderId)) {
                sendError(res, 400, "INVALID_ORDER_ID", "Invalid order ID");
                return;
            }

            const updatedOrder = await OrderService.acceptOrder(orderId, courierId as string);
            res.status(200).json({ message: "Order accepted successfully", data: updatedOrder });
        } catch (error: any) {
            handleError(res, error, "Failed to accept order");
            //switch (error.message) {
                
                // case "ORDER_NOT_FOUND":
                //     res.status(404).json({ error: "Order not found" });
                //     break;
                // case "REQUESTER_CANNOT_ACCEPT_OWN_ORDER":
                //     res.status(403).json({ error: "You cannot accept your own errand request" });
                //     break;
                // case "ORDER_NOT_AVAILABLE":
                // case "ORDER_ACCEPTANCE_FAILED":
                //     res.status(409).json({ error: "Order is no longer available or was already accepted by another courier" });
                //     break;
                // default:
                //     res.status(500).json({ error: "Failed to accept order" });
            //}
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
            handleError(res, error, "Failed to update order status");
            // if (error.message.startsWith("UNAUTHORIZED_")) {
            //     res.status(403).json({ error: "You are not authorized to update this order" });
            //     return;
            // }
            // if (error.message === "ORDER_NOT_FOUND") {
            //     res.status(404).json({ error: "Order not found" });
            //     return;
            // }
            // if (["INVALID_STATE_TRANSITION", "STATUS_UPDATE_FAILED"].includes(error.message)) {
            //     res.status(409).json({ error: error.message });
            //     return;
            // }
            // res.status(500).json({ error: "Failed to update order status" });
        }
    }
};
