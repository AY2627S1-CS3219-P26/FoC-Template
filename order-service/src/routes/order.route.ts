import { Router } from "express";
import { OrderController } from "../controllers/order.controller.ts";
import { createRequireAuth } from "../middleware/auth.middleware.ts";
import { config } from "../config.ts";

const router = Router();
router.use(createRequireAuth(config.USER_SERVICE_URL));

// POST /orders - Create a new errand request
router.post("/", OrderController.createOrder);

// GET /orders/open - Browse open requests available for couriers[cite: 7]
router.get("/open", OrderController.getOpenRequests);

// GET /orders/mine - Errands of the logged-in account as requester or courier, newest first.
// Registered before /:id, which would otherwise take "mine" as an id.
router.get("/mine", OrderController.getMyOrders);

// GET /orders/:id - Get specific order details
router.get("/:id", OrderController.getOrderById);

// POST /orders/:id/accept - Assign a courier to an open order[cite: 7]
router.post("/:id/accept", OrderController.acceptOrder);

// PATCH /orders/:id/status - Update order lifecycle status (e.g., PICKED_UP, COMPLETED, CANCELLED)[cite: 7]
router.patch("/:id/status", OrderController.updateStatus);

export default router;
