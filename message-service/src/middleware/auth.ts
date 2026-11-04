import type { RequestHandler } from "express";
import type { ExtendedError, Socket } from "socket.io";
import { config } from "../config.ts";

const TIMEOUT_MS = 2000;
const SESSION_COOKIE = "relay_session";

type Role = "member" | "administrator";

// Returns the account id, or null for every answer other than authorized (N1.1.2).
async function authorize(token: string, role: Role): Promise<string | null> {
    try {
        const response = await fetch(`${config.USER_SERVICE_URL}/internal/authorize`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token, requiredRole: role }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const result = await response.json();
        // The user-service also answers a refusal with 200, so only the decision counts.
        return response.ok && result.decision === "authorized" ? result.accountId : null;
    } catch {
        return null;
    }
}

export function cookieHttpMiddleware(role: Role): RequestHandler {
    return async (req, res, next) => {
        const token = req.cookies?.[SESSION_COOKIE];
        if (!token) {
            res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please log in" } });
            return;
        }

        const accountId = await authorize(token, role);
        if (!accountId) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not allowed to do this" } });
            return;
        }

        res.locals.accountId = accountId;
        next();
    };
}

// Runs once when a socket connects. cookieParser only runs for Express, so the header is read here.
export async function cookieSocketMiddleware(socket: Socket, next: (err?: ExtendedError) => void) {
    const token = getSessionCookieValue(socket.handshake.headers.cookie);
    const accountId = token && await authorize(token, "member");
    if (!accountId) {
        next(new Error("FORBIDDEN"));
        return;
    }

    socket.data.token = token;
    socket.data.accountId = accountId;
    next();
}

// Runs for every event, so a session that ended after connecting cannot keep sending.
export function cookieSocketEventMiddleware(socket: Socket) {
    return async (_event: unknown[], next: (err?: Error) => void) => {
        const accountId = await authorize(socket.data.token, "member");
        next(accountId === socket.data.accountId ? undefined : new Error("FORBIDDEN"));
    };
}

function getSessionCookieValue(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const at = part.indexOf("=");
        if (at === -1 || part.slice(0, at).trim() !== SESSION_COOKIE) continue;
        const value = part.slice(at + 1).trim();
        return value === "" ? null : value;
    }
    return null;
}
