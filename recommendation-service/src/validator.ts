import { z } from "zod";
import type { ValidationResult } from "./types.ts";

const RequestSchema = z.object({
    supplierId: z.string().trim().min(1, "supplierId is required"),
    location: z.string().trim().min(2, "location is required"),
    neededBy: z.string()
        .datetime({ message: "neededBy must be a valid ISO 8601 timestamp" })
        .refine((ts) => new Date(ts) > new Date(), "neededBy must be in the future"),
    items: z.array(z.string().trim().min(1, "item cannot be empty"))
        .min(1, "at least one item is required")
        .max(10, "cannot have more than 10 items"),
});

export function validateRecommendationRequest(input: unknown): ValidationResult {
    const parsed = RequestSchema.safeParse(input);
    if (parsed.success) {
        return { ok: true, data: parsed.data };
    }
    const errors = parsed.error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { ok: false, errors };
}
