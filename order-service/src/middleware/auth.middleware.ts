import { Request, Response, NextFunction } from "express";
import { config } from "../config.ts";
import { logger } from "../lib/logger.ts";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const sessionToken = req.headers.authorization || req.headers["x-session-token"];
        if (!sessionToken) {
            res.status(401).json({ error: "Unauthorized: Missing session credential" });
            return;
        }

        // If running locally, stub out specific test tokens so you don't need the User Service
        if (config.NODE_ENV === "development") {
            if (sessionToken === "session-token-requester-123") {
                (req as any).user = {
                    id: "user-requester-001", // Fake Requester ID
                    roles: ["member"]
                };
                return next();
            }
            if (sessionToken === "session-token-courier-456") {
                (req as any).user = {
                    id: "user-courier-002", // Fake Courier ID (different from requester!)
                    roles: ["member"]
                };
                return next();
            }
        }

        // Call User Service authorization endpoint (Fail closed)
        const response = await fetch(`${config.USER_SERVICE_URL}/internal/authorize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": sessionToken as string
            },
            body: JSON.stringify({ path: req.baseUrl + req.path, method: req.method })
        });

        if (!response.ok) {
            res.status(403).json({ error: "Access denied by User Service" });
            return;
        }

        const data = await response.json() as { userId: string; roles: string[] };

        // Attach authenticated user context to request
        (req as any).user = {
            id: data.userId,
            roles: data.roles
        };

        next();
    } catch (error) {
        logger.error({ error }, "Authorization check failed");
        res.status(500).json({ error: "Authorization service unavailable" });
    }
}