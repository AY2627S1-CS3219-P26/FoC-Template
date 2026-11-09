import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validationError } from '../util/validation.ts';

export function validateBody(schema: z.ZodType) {
    return function (req: Request, res: Response, next: NextFunction): void {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            next(validationError(result.error));
            return;
        }

        req.body = result.data;
        next();
    };
}