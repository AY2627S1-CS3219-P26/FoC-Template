import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ReportModel } from "../src/models/report.model.ts";
import { useTestDatabase } from "./helpers/db.ts";
import { app, createUser, loginAs } from "./helpers/users.ts";

useTestDatabase();

const REASON = "Took the food and never delivered it";

describe("POST /reports (F1.6.3)", () => {
    it("files a report on another account and errand as Open", async () => {
        const alice = await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        const member = await loginAs("alice");
        const before = Date.now();

        const response = await member.post("/reports").send({ reportedId: bob, errandId: " 42 ", reason: `  ${REASON}  ` }).expect(201);

        expect(response.body).toMatchObject({ id: expect.any(String), reportedId: bob, errandId: "42", reason: REASON, state: "Open" });
        expect(Date.parse(response.body.filedAt)).toBeGreaterThanOrEqual(before);
        // F1.6.5: the stored report also knows who filed it, and has no decision yet
        const stored = await ReportModel.findById(response.body.id);
        expect(stored).toMatchObject({ reporterId: alice, reportedId: bob, errandId: "42", state: "Open" });
        expect(stored?.decision).toBeUndefined();
    });

    it("needs a session", async () => {
        const bob = await createUser({ username: "bob" });

        await request(app).post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }).expect(401);

        expect(await ReportModel.countDocuments()).toBe(0);
    });

    it("lets the same reporter report the same account again on another errand", async () => {
        await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        const member = await loginAs("alice");

        await member.post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }).expect(201);
        await member.post("/reports").send({ reportedId: bob, errandId: "43", reason: REASON }).expect(201);

        expect(await ReportModel.countDocuments()).toBe(2);
    });
});

describe("refused reports (F1.6.4)", () => {
    it("name a reason outside 20 to 500 characters and every missing field", async () => {
        await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        const member = await loginAs("alice");

        const tooShort = await member.post("/reports").send({ reportedId: bob, errandId: "42", reason: "He was rude to me" }).expect(400);
        const tooLong = await member.post("/reports").send({ reportedId: bob, errandId: "42", reason: "x".repeat(501) }).expect(400);
        const empty = await member.post("/reports").send({}).expect(400);

        expect(tooShort.body.error.details.fields.reason).toEqual(["must be between 20 and 500 characters"]);
        expect(tooLong.body.error.details.fields.reason).toEqual(["must be between 20 and 500 characters"]);
        expect(empty.body.error.details.fields).toEqual({
            reportedId: ["is required"],
            errandId: ["is required"],
            reason: ["is required"],
        });
        expect(await ReportModel.countDocuments()).toBe(0);
    });

    it("name a report on the reporter's own account or on an unknown one", async () => {
        const alice = await createUser({ username: "alice" });
        const member = await loginAs("alice");

        const own = await member.post("/reports").send({ reportedId: alice, errandId: "42", reason: REASON }).expect(400);
        const unknown = await member.post("/reports").send({ reportedId: randomUUID(), errandId: "42", reason: REASON }).expect(400);

        expect(own.body.error.details.fields.reportedId).toEqual(["cannot be your own account"]);
        expect(unknown.body.error.details.fields.reportedId).toEqual(["does not exist"]);
        expect(await ReportModel.countDocuments()).toBe(0);
    });

    it("name a second report by the same reporter on the same errand, even sent at once", async () => {
        await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        const carol = await createUser({ username: "carol" });
        const member = await loginAs("alice");

        const results = await Promise.all([
            member.post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }),
            member.post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }),
        ]);
        // On the same errand, naming another account counts as a repeat as well
        const other = await member.post("/reports").send({ reportedId: carol, errandId: "42", reason: REASON }).expect(400);

        expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
        expect(other.body.error.details.fields.errandId).toEqual(["has already been reported by you"]);
        expect(await ReportModel.countDocuments()).toBe(1);
    });

    it("do not stop another reporter on the same errand", async () => {
        await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        await createUser({ username: "carol" });
        const alice = await loginAs("alice");
        const carol = await loginAs("carol");

        await alice.post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }).expect(201);
        await carol.post("/reports").send({ reportedId: bob, errandId: "42", reason: REASON }).expect(201);

        expect(await ReportModel.countDocuments({ reportedId: bob })).toBe(2);
    });
});
