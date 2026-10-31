import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";

const router = Router();

// POST /orders - Create a new errand request
router.post("/", OrderController.createOrder);

// GET /orders/open - Browse open requests available for couriers[cite: 7]
router.get("/open", OrderController.getOpenRequests);

// GET /orders/:id - Get specific order details
router.get("/:id", OrderController.getOrderById);

// GET /orders/requester/:id - Get specific order details
router.get("/requester/:id", OrderController.getOrderByRequesterId);

// GET /orders/courier/:id - Get specific order details
router.get("/courier/:id", OrderController.getOrderByCourierId);

// POST /orders/:id/accept - Assign a courier to an open order[cite: 7]
router.post("/:id/accept", OrderController.acceptOrder);

// PATCH /orders/:id/status - Update order lifecycle status (e.g., PICKED_UP, COMPLETED, CANCELLED)[cite: 7]
router.patch("/:id/status", OrderController.updateStatus);

export default router;
