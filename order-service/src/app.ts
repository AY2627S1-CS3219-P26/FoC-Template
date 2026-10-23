import express, { Express } from "express";
import orderRoutes from "./routes/order.route.ts";
import { logger } from "./lib/logger.ts";

export function createApp(): Express {
    const app = express();

    app.use(express.json());

    // Request logging middleware
    app.use((req, _res, next) => {
        logger.debug({ method: req.method, url: req.url }, "incoming request");
        next();
    });

    // Health check endpoint
    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "healthy", service: "order-service" });
    });

    // Routes
    app.use("/orders", orderRoutes);

    // Global Error Handler (prevents leaking raw error messages in 500 responses)
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error({ err }, "Unhandled application error");
        res.status(500).json({ error: "Internal server error" });
    });

    return app;
}