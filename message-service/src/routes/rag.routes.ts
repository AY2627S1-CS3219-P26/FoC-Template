import { Router } from "express";

export const ragRouter = Router();

ragRouter.get("health", (_req, res) => {
    res.status(200).json({ status: "ok" });
})

export default ragRouter;
