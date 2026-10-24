import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ReportModel, type ReportState } from "../src/models/report.model.ts";
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

describe("reports for administrators (F1.6.5, F5.5.4)", () => {
    const ADMIN_ROLES = ["member", "administrator"] as const;

    // Writes a report straight into the database, so a test can choose its time, state and decision.
    type StoredReport = {
        reporterId: string;
        reportedId: string;
        errandId: string;
        filedAt: string;
        state?: ReportState;
        decision?: { byId: string; justification: string; decidedAt: Date };
    };

    function storeReport(fields: StoredReport) {
        return ReportModel.create({ reason: REASON, ...fields, filedAt: new Date(fields.filedAt) });
    }

    async function adminWithReports() {
        const adminId = await createUser({ username: "admin", roles: [...ADMIN_ROLES] });
        const alice = await createUser({ username: "alice" });
        const bob = await createUser({ username: "bob" });
        const gone = randomUUID();
        const older = await storeReport({ reporterId: alice, reportedId: bob, errandId: "41", filedAt: "2026-10-20T08:00:00.000Z" });
        const decided = await storeReport({
            reporterId: gone,
            reportedId: bob,
            errandId: "42",
            filedAt: "2026-10-21T08:00:00.000Z",
            state: "Dismissed",
            decision: { byId: adminId, justification: "Both sides agree it was a misunderstanding", decidedAt: new Date("2026-10-22T08:00:00.000Z") },
        });
        const newest = await storeReport({ reporterId: bob, reportedId: alice, errandId: "43", filedAt: "2026-10-23T08:00:00.000Z" });
        return { admin: await loginAs("admin"), adminId, alice, bob, older, decided, newest };
    }

    it("list newest first with the accounts behind each report", async () => {
        const { admin, adminId, alice, bob, older, decided, newest } = await adminWithReports();

        const response = await admin.get("/reports").expect(200);

        expect(response.body).toMatchObject({ page: 1, pageSize: 20, total: 3 });
        expect(response.body.items.map((report: { id: string }) => report.id)).toEqual([newest._id, decided._id, older._id]);
        expect(response.body.items[2]).toEqual({
            id: older._id,
            reporter: { id: alice, fullName: "alice", username: "alice", state: "Active" },
            reported: { id: bob, fullName: "bob", username: "bob", state: "Active" },
            errandId: "41",
            reason: REASON,
            state: "Open",
            filedAt: "2026-10-20T08:00:00.000Z",
            decision: null,
        });
        // The reporter of this one was deleted since; the report stays readable
        expect(response.body.items[1]).toMatchObject({
            reporter: null,
            state: "Dismissed",
            decision: {
                by: { id: adminId, username: "admin" },
                justification: "Both sides agree it was a misunderstanding",
                decidedAt: "2026-10-22T08:00:00.000Z",
            },
        });
    });

    it("filter by state and by reported account, and page through them", async () => {
        const { admin, alice, bob, older, newest } = await adminWithReports();

        const open = await admin.get("/reports").query({ state: "Open" }).expect(200);
        const aboutBob = await admin.get("/reports").query({ reportedId: bob }).expect(200);
        const openAboutAlice = await admin.get("/reports").query({ state: "Open", reportedId: alice }).expect(200);
        const secondPage = await admin.get("/reports").query({ pageSize: 2, page: 2 }).expect(200);
        const unknown = await admin.get("/reports").query({ state: "Closed" }).expect(400);

        expect(open.body.items.map((report: { id: string }) => report.id)).toEqual([newest._id, older._id]);
        expect(aboutBob.body.total).toBe(2);
        expect(openAboutAlice.body.items).toMatchObject([{ id: newest._id }]);
        expect(secondPage.body).toMatchObject({ page: 2, total: 3, items: [{ id: older._id }] });
        expect(unknown.body.error.details.fields.state).toEqual(["must be Open, Dismissed or Actioned"]);
    });

    it("show one report, and name an unknown id", async () => {
        const { admin, decided } = await adminWithReports();

        const response = await admin.get(`/reports/${decided._id}`).expect(200);
        const unknown = await admin.get(`/reports/${randomUUID()}`).expect(404);

        expect(response.body).toMatchObject({ id: decided._id, errandId: "42", state: "Dismissed", reporter: null });
        expect(unknown.body.error.code).toBe("REPORT_NOT_FOUND");
    });

    it("are refused to members the same way whether or not the report exists", async () => {
        const { older } = await adminWithReports();
        const member = await loginAs("alice");

        await member.get("/reports").expect(403);
        const existing = await member.get(`/reports/${older._id}`).expect(403);
        const missing = await member.get(`/reports/${randomUUID()}`).expect(403);

        expect(existing.body).toEqual(missing.body);
    });
});
