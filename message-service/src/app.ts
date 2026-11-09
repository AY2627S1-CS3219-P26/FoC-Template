import express, { type Request, type Response } from "express";
import helmet from "helmet";

import cookieParser from "cookie-parser";
import { cookieHttpMiddleware } from "./middleware/auth.ts";
import { healthRouter } from "./routes/health.routes.ts";
import messagesRouter from "./routes/messages.routes.ts";

export function createApp() {
    const app = express();

    //app.use(helmet());
    app.use(express.json({ limit: "10kb" }));
    app.use(cookieParser());


    app.use(healthRouter);
    app.use("/messages", cookieHttpMiddleware("member"), messagesRouter);

    return app;
}
