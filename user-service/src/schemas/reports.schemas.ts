import { z } from "zod";
import { REPORT_STATES } from "../models/report.model.ts";
import { PageQuery, Reason } from "./users.schemas.ts";

export const ReportBody = z.object({
    reportedId: z.string().trim().min(1, "is required"),
    errandId: z.string().trim().min(1, "is required").max(64, "must be at most 64 characters"),
    reason: Reason
});

export const ListReportsQuery = PageQuery.extend({
    state: z.enum(REPORT_STATES, "must be Open, Dismissed or Actioned").optional(),
    reportedId: z.string().trim().optional()
});
