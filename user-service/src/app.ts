import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health.routes.ts";
import { errorHandler, notFound } from "./middleware/errorHandler.ts";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(express.json({ limit: "10kb" }));

    app.use(healthRouter);

    app.use(notFound);
    app.use(errorHandler);
    return app;
}