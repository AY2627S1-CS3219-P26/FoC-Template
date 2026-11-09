import { beforeEach, vi } from "vitest";

export const ALICE = "alice-id";
export const BOB = "bob-id";
export const CAROL = "carol-id";

// Session tokens the fake user-service knows. Any other token is denied.
const sessions: Record<string, string> = {
    "alice-token": ALICE,
    "bob-token": BOB,
    "carol-token": CAROL,
};

export const cookieOf = (token: string) => `relay_session=${token}`;

// Answers POST /internal/authorize like the user-service does, so no real one is needed.
export function useFakeUserService(): void {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
            const { token } = JSON.parse(init.body);
            const accountId = sessions[token];
            const body = accountId ? { decision: "authorized", accountId, roles: ["member"] } : { decision: "denied" };
            return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
        }));
    });
}

// The user-service is down or unreachable.
export function userServiceDown(): void {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED"); }));
}
