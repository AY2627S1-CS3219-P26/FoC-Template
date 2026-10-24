import { z } from "zod";
import { Reason } from "./users.schemas.ts";

export const ReportBody = z.object({
    reportedId: z.string().trim().min(1, "is required"),
    errandId: z.string().trim().min(1, "is required").max(64, "must be at most 64 characters"),
    reason: Reason
});
