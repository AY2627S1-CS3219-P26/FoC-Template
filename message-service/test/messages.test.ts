import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { ALICE, BOB, cookieOf, useFakeUserService, userServiceDown } from "./helpers/auth.ts";
import { useTestDatabase } from "./helpers/db.ts";

useTestDatabase();
useFakeUserService();

const app = createApp();
const send = (token: string, body: object) =>
    request(app).post("/messages/send").set("Cookie", cookieOf(token)).send(body);

describe("authorization", () => {
    it("refuses a request without a session cookie", async () => {
        const res = await request(app).get("/messages/conversations");
        expect(res.status).toBe(401);
    });

    it("refuses a session the user-service denies", async () => {
        const res = await request(app).get("/messages/conversations").set("Cookie", cookieOf("unknown-token"));
        expect(res.status).toBe(403);
    });

    it("refuses when the user-service cannot be reached", async () => {
        userServiceDown();
        const res = await request(app).get("/messages/conversations").set("Cookie", cookieOf("alice-token"));
        expect(res.status).toBe(403);
    });

    it("does not let a third person read a conversation", async () => {
        await send("alice-token", { receiverId: BOB, content: "hi" });
        const res = await request(app).get(`/messages/${ALICE}/${BOB}`).set("Cookie", cookieOf("carol-token"));
        expect(res.status).toBe(403);
    });
});

describe("sending", () => {
    it("saves the message with the logged-in account as sender", async () => {
        const res = await send("alice-token", { receiverId: BOB, content: "hi bob", senderId: "someone-else" });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ senderId: ALICE, receiverId: BOB, content: "hi bob", status: "unread" });
    });

    it("refuses an empty message", async () => {
        const res = await send("alice-token", { receiverId: BOB, content: "   " });
        expect(res.status).toBe(400);
    });

    it("refuses a message to Relay", async () => {
        const res = await send("alice-token", { receiverId: "0", content: "hello relay" });
        expect(res.status).toBe(400);
    });
});

describe("reading", () => {
    it("returns both directions of a conversation, oldest first", async () => {
        await send("alice-token", { receiverId: BOB, content: "first" });
        await send("bob-token", { receiverId: ALICE, content: "second" });

        const res = await request(app).get(`/messages/${ALICE}/${BOB}`).set("Cookie", cookieOf("alice-token"));
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(2);
        expect(res.body.items.map((m: { content: string }) => m.content)).toEqual(["first", "second"]);
    });

    it("refuses a page below 1", async () => {
        const res = await request(app).get(`/messages/${ALICE}/${BOB}?page=0`).set("Cookie", cookieOf("alice-token"));
        expect(res.status).toBe(400);
    });

    it("lists conversations with the unread count for the reader", async () => {
        await send("alice-token", { receiverId: BOB, content: "one" });
        await send("alice-token", { receiverId: BOB, content: "two" });

        const res = await request(app).get("/messages/conversations").set("Cookie", cookieOf("bob-token"));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({ otherId: ALICE, unread: 2, lastMessage: { content: "two" } });
    });
});
