import { Router } from "express";
import { file } from "../controllers/reports.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// Any logged-in account may report another one (F1.5.4: the member role suffices)
reportsRouter.post("/", file);
