import type { Request, Response, NextFunction } from "express";

export function createRequireAuth(userServiceUrl: string, request: typeof fetch = fetch) {
    return async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
        const token = req.headers.cookie?.split(";")
            .map((part) => part.trim()).find((part) => part.startsWith("relay_session="))
            ?.slice("relay_session=".length);
        if (!token) {
            res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "A session is required" } });
            return;
        }
        try {
            const response = await request(new URL("/internal/authorize", userServiceUrl), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token, requiredRole: "member" }),
                signal: AbortSignal.timeout(2000),
            });
            const body = response.ok ? await response.json() as { decision?: string; accountId?: string } : null;
            if (body?.decision === "authorized" && typeof body.accountId === "string" && body.accountId !== "") {
                res.locals.accountId = body.accountId;
                next();
                return;
            }
        } catch {
            // A failed authorization request is a refusal, as in the other services.
        }
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied by User Service" } });
    };
}
