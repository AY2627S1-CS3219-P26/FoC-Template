import express, { type Request, type Response } from "express";
import helmet from "helmet";

import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health.routes.ts";
import messagesRouter from "./routes/messages.routes.ts";
import ragRouter from "./routes/rag.routes.ts";

export function createApp() {
    const app = express();

    //app.use(helmet());
    app.use(express.json({ limit: "10kb" }));
    app.use(cookieParser());

    app.use("", (req: Request, res: Response) => res.status(200))

    app.use(healthRouter);
    app.use("/messages", messagesRouter);
    app.use("/rag", ragRouter);

    return app;
}
