import type { RequestHandler } from "express";
import { authOf } from "../middleware/authenticate.ts";

export const me: RequestHandler = (req, res) => {
    res.status(200).json(authOf(req).account);
};