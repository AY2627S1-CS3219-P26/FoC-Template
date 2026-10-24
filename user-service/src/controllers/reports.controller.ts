import type { RequestHandler } from "express";
import { authOf } from "../middleware/authenticate.ts";
import { fileReport, getReport, listReports } from "../services/report.service.ts";

export const file: RequestHandler = async (req, res) => {
    res.status(201).json(await fileReport(authOf(req).account.id, req.body));
};

export const list: RequestHandler = async (req, res) => {
    res.status(200).json(await listReports(req.query));
};

export const getOne: RequestHandler = async (req, res) => {
    res.status(200).json(await getReport(String(req.params.id)));
};
