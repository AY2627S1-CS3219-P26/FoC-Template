import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedTransitions, createOrderService } from "../src/services/order.service.ts";
import { createServiceClients } from "../src/services/clients.ts";

const input = {
    supplierId: "supplier-1", deliveryLocation: "COM1",
    neededByTime: "2099-10-23T04:00:00.000Z", itemLines: ["Coffee"], creditReward: 5,
};

function setup() {
    let order: any;
    const effects: string[] = [];
    const transitions: string[][] = [];
    const model: any = {
        async create(data: any) {
            order = { id: 42, requester_id: data.requesterId, courier_id: null,
                status: "Pending", credit_reward: data.creditReward };
            return { ...order };
        },
        async findById() { return order ? { ...order } : null; },
        async updateStatus(_id: number, status: string, expected: string, actor: string) {
            if (order.status !== expected) return null;
            order.status = status;
            transitions.push([expected, status, actor]);
            if (["Completed", "Cancelled", "Expired"].includes(status)) effects.push(status);
            return { ...order };
        },
    };
    const clients = {
        async checkSupplier(_supplier: string, _at: string, _cookie: string) { effects.push("supplier"); },
        async reserve(_user: string, ref: string, amount: number, cookie: string) {
            assert.equal(ref, "42"); assert.equal(amount, 5); assert.equal(cookie, "relay_session=valid");
            effects.push("reserve");
        },
    };
    return { service: createOrderService(model, clients), model, clients, effects, transitions, order: () => order };
}

test("creation validates supplier and reserves credits before making an order Open", async () => {
    const ctx = setup();
    const order = await ctx.service.createOrder("requester", input, "relay_session=valid");
    assert.equal(order.status, "Open");
    assert.deepEqual(ctx.effects, ["supplier", "reserve"]);
    assert.deepEqual(ctx.transitions, [["Pending", "Open", "requester"]]);
});

test("supplier rejection creates no order or credit reservation", async () => {
    const ctx = setup();
    ctx.clients.checkSupplier = async () => { throw new Error("SUPPLIER_UNAVAILABLE"); };
    await assert.rejects(ctx.service.createOrder("requester", input, "relay_session=valid"), /SUPPLIER_UNAVAILABLE/);
    assert.equal(ctx.order(), undefined);
    assert.deepEqual(ctx.effects, []);
});

test("credit rejection cancels the pending order and schedules release", async () => {
    const ctx = setup();
    ctx.clients.reserve = async () => { throw new Error("CREDIT_RESERVATION_FAILED"); };
    await assert.rejects(ctx.service.createOrder("requester", input, "relay_session=valid"), /CREDIT_RESERVATION_FAILED/);
    assert.equal(ctx.order().status, "Cancelled");
    assert.deepEqual(ctx.effects, ["supplier", "Cancelled"]);
    assert.deepEqual(ctx.transitions, [["Pending", "Cancelled", "system"]]);
});

test("completion and cancellation use the persisted lifecycle, and repeated completion is safe", async () => {
    const ctx = setup();
    await ctx.service.createOrder("requester", input, "relay_session=valid");
    ctx.order().status = "Delivered";
    ctx.order().courier_id = "courier";
    await assert.rejects(ctx.service.updateOrderStatus(42, "stranger", "Completed"), /UNAUTHORIZED/);
    assert.equal((await ctx.service.updateOrderStatus(42, "requester", "Completed")).status, "Completed");
    assert.equal((await ctx.service.updateOrderStatus(42, "requester", "Completed")).status, "Completed");
    assert.deepEqual(ctx.effects, ["supplier", "reserve", "Completed"]);
    // The refused and the repeated request leave no record.
    assert.deepEqual(ctx.transitions, [["Pending", "Open", "requester"], ["Delivered", "Completed", "requester"]]);
});

test("an unrelated user cannot cancel, and status PATCH cannot bypass courier acceptance", async () => {
    const ctx = setup();
    await ctx.service.createOrder("requester", input, "relay_session=valid");
    await assert.rejects(ctx.service.updateOrderStatus(42, "stranger", "Cancelled"), /UNAUTHORIZED/);
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "Accepted"), /INVALID_STATE_TRANSITION/);
    assert.equal(ctx.order().status, "Open");
});

test("each participant may only instruct the transitions of their role, and nobody may expire an errand", async () => {
    const ctx = setup();
    await ctx.service.createOrder("requester", input, "relay_session=valid");
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "Expired"), /INVALID_STATE_TRANSITION/);
    ctx.order().status = "Accepted";
    ctx.order().courier_id = "courier";
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "PickedUp"), /UNAUTHORIZED/);
    await assert.rejects(ctx.service.updateOrderStatus(42, "courier", "Cancelled"), /UNAUTHORIZED/);
    assert.equal((await ctx.service.updateOrderStatus(42, "courier", "PickedUp")).status, "PickedUp");
    await assert.rejects(ctx.service.updateOrderStatus(42, "courier", "Completed"), /INVALID_STATE_TRANSITION/);
});

test("allowed transitions follow the state machine for requester and courier", () => {
    const order = (status: string) => ({ status, requester_id: "requester", courier_id: status === "Open" ? null : "courier" }) as any;
    const expected: Record<string, [string[], string[]]> = {
        Open: [["Cancelled"], []],
        Accepted: [["Cancelled"], ["PickedUp"]],
        PickedUp: [[], ["Delivered"]],
        Delivered: [["Completed"], []],
        Completed: [[], []], Cancelled: [[], []], Expired: [[], []],
    };
    for (const [status, [requester, courier]] of Object.entries(expected)) {
        assert.deepEqual(allowedTransitions(order(status), "requester"), requester, `${status} as requester`);
        assert.deepEqual(allowedTransitions(order(status), "courier"), courier, `${status} as courier`);
        assert.deepEqual(allowedTransitions(order(status), "stranger"), [], `${status} as stranger`);
    }
});

test("own errands carry the account's role and the transitions it may instruct", async () => {
    const ctx = setup();
    const transitions = [{ from_status: "Open", to_status: "Accepted", actor: "courier", occurred_at: "2026-11-09T04:00:00.000Z" }];
    ctx.model.findByParticipant = async (accountId: string) => {
        assert.equal(accountId, "courier");
        return [
            { id: 2, status: "PickedUp", requester_id: "requester", courier_id: "courier", transitions },
            { id: 1, status: "Open", requester_id: "courier", courier_id: null, transitions: [] },
        ];
    };
    const mine = await ctx.service.getMyOrders("courier");
    assert.deepEqual(mine.map((order) => [order.id, order.role, order.allowed_transitions]), [
        [2, "courier", ["Delivered"]],
        [1, "requester", ["Cancelled"]],
    ]);
    assert.deepEqual(mine[0].transitions, transitions);
});

test("HTTP clients use the supplier availability and credit reservation contracts with the session cookie", async () => {
    const calls: { url: URL; init: RequestInit }[] = [];
    const clients = createServiceClients("http://supplier:3002", "http://credit:3002", async (url, init) => {
        calls.push({ url: new URL(String(url)), init: init! });
        return new Response(calls.length === 1 ? JSON.stringify({ orderable: true }) : "Credits reserved");
    });
    await clients.checkSupplier("supplier/1", input.neededByTime, "relay_session=valid");
    await clients.reserve("requester", "42", 5, "relay_session=valid");
    assert.equal(calls[0].url.pathname, "/suppliers/supplier%2F1/availability");
    assert.equal(calls[0].url.searchParams.get("at"), "2099-10-23T04:00:00.000Z");
    assert.equal(new Headers(calls[0].init.headers).get("cookie"), "relay_session=valid");
    assert.equal(calls[1].url.pathname, "/credits/reserve");
    assert.equal(calls[1].init.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { userId: "requester", errandRef: "42", amount: 5 });
    assert.equal(new Headers(calls[1].init.headers).get("cookie"), "relay_session=valid");
});

test("supplier closed, missing, malformed and failed answers all prevent an order", async () => {
    for (const response of [
        new Response(JSON.stringify({ orderable: false })), new Response("{}"),
        new Response("missing", { status: 404 }), new Response("down", { status: 503 }),
    ]) {
        const clients = createServiceClients("http://supplier", "http://credit", async () => response);
        await assert.rejects(clients.checkSupplier("s1", input.neededByTime, "relay_session=valid"));
    }
});

test("a refused credit reservation is a conflict and a network failure is unavailable", async () => {
    const clients = createServiceClients("http://supplier", "http://credit", async () => new Response("Insufficient available credits", { status: 400 }));
    await assert.rejects(clients.reserve("requester", "42", 5, "relay_session=valid"), { status: 409 });
    const down = createServiceClients("http://supplier", "http://credit", async () => { throw new Error("connection refused"); });
    await assert.rejects(down.reserve("requester", "42", 5, "relay_session=valid"), { status: 503 });
});
