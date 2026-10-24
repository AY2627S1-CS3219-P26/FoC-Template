import type { RequestHandler } from "express";
import { authOf } from "../middleware/authenticate.ts";
import { fileReport } from "../services/report.service.ts";

export const file: RequestHandler = async (req, res) => {
    res.status(201).json(await fileReport(authOf(req).account.id, req.body));
};
