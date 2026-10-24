import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { UserModel } from "../src/models/user.model.ts";
import { useTestDatabase } from "./helpers/db.ts";
import { createUser, loginAs } from "./helpers/users.ts";

useTestDatabase();

const ADMIN_ROLES = ["member", "administrator"] as const;

function stateChange(actorId: string, from: string, to: string, at: string) {
    return { changeId: randomUUID(), from, to, reason: `${to} after the conduct review on ${at}`, actorId, at: new Date(at) };
}

describe("state history (F1.6.2)", () => {
    it("is part of an account as an administrator sees it", async () => {
        await createUser({ username: "admin", roles: [...ADMIN_ROLES] });
        const carol = await createUser({ username: "carol" });
        const admin = await loginAs("admin");

        const response = await admin.get(`/users/${carol}`).expect(200);

        expect(response.body).toMatchObject({ id: carol, state: "Active", stateChanges: [] });
    });

    it("lists the changes newest first with the acting administrator", async () => {
        const adminId = await createUser({ username: "admin", roles: [...ADMIN_ROLES] });
        const carol = await createUser({ username: "carol" });
        const goneAdmin = randomUUID();
        await UserModel.updateOne(
            { _id: carol },
            {
                $push: {
                    stateChanges: [
                        stateChange(goneAdmin, "Active", "Suspended", "2026-10-01T08:00:00.000Z"),
                        stateChange(adminId, "Suspended", "Active", "2026-10-02T08:00:00.000Z"),
                    ],
                },
            },
        );
        const admin = await loginAs("admin");

        const response = await admin.get(`/users/${carol}`).expect(200);

        expect(response.body.stateChanges).toMatchObject([
            {
                from: "Suspended",
                to: "Active",
                reason: "Active after the conduct review on 2026-10-02T08:00:00.000Z",
                actor: { id: adminId, fullName: "admin", username: "admin", state: "Active" },
                at: "2026-10-02T08:00:00.000Z",
            },
            // An administrator deleted since then shows as null instead of failing the request.
            { from: "Active", to: "Suspended", actor: null, at: "2026-10-01T08:00:00.000Z" },
        ]);
        expect(response.body.stateChanges[0].id).toEqual(expect.any(String));
    });

    it("is never shown to the account holder or in the account list", async () => {
        await createUser({ username: "admin", roles: [...ADMIN_ROLES] });
        await createUser({ username: "alice" });
        const member = await loginAs("alice");
        const admin = await loginAs("admin");

        const me = await member.get("/users/me").expect(200);
        const list = await admin.get("/users").expect(200);

        expect(me.body).not.toHaveProperty("stateChanges");
        expect(list.body.items[0]).not.toHaveProperty("stateChanges");
    });
});
