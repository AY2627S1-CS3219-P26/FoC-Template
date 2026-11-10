import type { Request, Response, NextFunction } from "express";

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const roles = (res.locals.roles ?? []) as string[];
  if (!roles.includes("administrator")) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Administrator access required." },
    });
  }
  next();
}