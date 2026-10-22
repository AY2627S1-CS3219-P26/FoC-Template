import { Router } from "express";

export const messagesRouter = Router();

messagesRouter.get("health", (_req, res) => {
    res.status(200).json({ status: "ok" });
})

export default messagesRouter;
