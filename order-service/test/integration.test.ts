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
                status: "Pending", credit_reward: data.creditReward, needed_by_time: new Date(data.neededByTime) };
            return { ...order };
        },
        async findById() { return order ? { ...order } : null; },
        async acceptOrder(_id: number, courierId: string) {
            order.status = "Accepted";
            order.courier_id = courierId;
            return { ...order };
        },
        async updateStatus(_id: number, status: string, expected: string, actor: string) {
            if (order.status !== expected) return null;
            order.status = status;
            transitions.push([expected, status, actor]);
            if (["Completed", "Cancelled", "Expired", "Rejected"].includes(status)) effects.push(status);
            return { ...order };
        },
    };
    const clients = {
        async supplierAvailability(_supplier: string, _at: string, _cookie: string) {
            effects.push("supplier");
            return { active: true, open: true } as { active: boolean; open: boolean } | null;
        },
        async reserve(_user: string, ref: string, amount: number, cookie: string) {
            assert.equal(ref, "42"); assert.equal(amount, 5); assert.equal(cookie, "relay_session=valid");
            effects.push("reserve");
        },
    };
    return { service: createOrderService(model, clients), model, clients, effects, transitions, order: () => order };
}

async function openErrand(status = "Open", courier: string | null = null) {
    const ctx = setup();
    await ctx.service.createOrder("requester", input, "relay_session=valid");
    ctx.order().status = status;
    ctx.order().courier_id = courier;
    return ctx;
}

test("creation validates supplier and reserves credits before making an order Open", async () => {
    const ctx = setup();
    const order = await ctx.service.createOrder("requester", input, "relay_session=valid");
    assert.equal(order.status, "Open");
    assert.deepEqual(ctx.effects, ["supplier", "reserve"]);
    assert.deepEqual(ctx.transitions, [["Pending", "Open", "requester"]]);
});

test("a refused submission names every invalid field at once and creates nothing", async () => {
    const ctx = setup();
    const body = { supplierId: "supplier-1", deliveryLocation: "x", neededByTime: "2020-01-01T00:00:00.000Z", itemLines: [], creditReward: 51 };
    await assert.rejects(ctx.service.createOrder("requester", body, "relay_session=valid"), {
        status: 400,
        code: "VALIDATION_FAILED",
        details: { fields: {
            deliveryLocation: ["must be at least 2 characters"],
            itemLines: ["needs at least 1 item"],
            creditReward: ["must be between 1 and 50"],
            neededByTime: ["must be in the future"],
        } },
    });
    assert.equal(ctx.order(), undefined);
    assert.deepEqual(ctx.effects, [], "the supplier is not asked about a time in the past");
});

test("an unknown, inactive or closed supplier is a field error next to the other ones", async () => {
    for (const [answer, message] of [
        [null, "does not exist"],
        [{ active: false, open: true }, "is inactive"],
        [{ active: true, open: false }, "is closed at the needed-by time"],
    ] as const) {
        const ctx = setup();
        ctx.clients.supplierAvailability = async () => answer;
        await assert.rejects(ctx.service.createOrder("requester", { ...input, creditReward: 0 }, "relay_session=valid"), {
            status: 400,
            details: { fields: { creditReward: ["must be between 1 and 50"], supplierId: [message] } },
        });
        assert.equal(ctx.order(), undefined);
    }
});

test("a failed supplier lookup refuses the errand without creating it", async () => {
    const ctx = setup();
    ctx.clients.supplierAvailability = async () => { throw Object.assign(new Error("down"), { status: 503 }); };
    await assert.rejects(ctx.service.createOrder("requester", input, "relay_session=valid"), { status: 503 });
    assert.equal(ctx.order(), undefined);
});

test("a refused or timed-out reservation leaves a Rejected order, which is no errand, and queues a release", async () => {
    const ctx = setup();
    const refusal = Object.assign(new Error("Your available credits do not cover this reward"), { status: 409, code: "INSUFFICIENT_CREDITS" });
    ctx.clients.reserve = async () => { throw refusal; };
    await assert.rejects(ctx.service.createOrder("requester", input, "relay_session=valid"), refusal);
    assert.equal(ctx.order().status, "Rejected");
    assert.deepEqual(ctx.effects, ["supplier", "Rejected"]);
    assert.deepEqual(ctx.transitions, [["Pending", "Rejected", "system"]]);
    await assert.rejects(ctx.service.getOrderById(42, "requester"), { status: 404 });
    await assert.rejects(ctx.service.acceptOrder(42, "courier"), { status: 404 });
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "Cancelled"), { status: 404 });
});

test("completion and cancellation use the persisted lifecycle, and repeated completion is safe", async () => {
    const ctx = await openErrand("Delivered", "courier");
    await assert.rejects(ctx.service.updateOrderStatus(42, "stranger", "Completed"), { status: 403, code: "NOT_ALLOWED" });
    assert.equal((await ctx.service.updateOrderStatus(42, "requester", "Completed")).status, "Completed");
    assert.equal((await ctx.service.updateOrderStatus(42, "requester", "Completed")).status, "Completed");
    assert.deepEqual(ctx.effects, ["supplier", "reserve", "Completed"]);
    // The refused and the repeated request leave no record.
    assert.deepEqual(ctx.transitions, [["Pending", "Open", "requester"], ["Delivered", "Completed", "requester"]]);
});

test("an unrelated user cannot cancel, and status PATCH cannot bypass courier acceptance", async () => {
    const ctx = await openErrand();
    await assert.rejects(ctx.service.updateOrderStatus(42, "stranger", "Cancelled"), { status: 403 });
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "Accepted"), { status: 409, code: "INVALID_STATE_TRANSITION" });
    assert.equal(ctx.order().status, "Open");
});

test("each participant may only instruct the transitions of their role, and nobody may expire an errand", async () => {
    const ctx = await openErrand();
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "Expired"), { code: "INVALID_STATE_TRANSITION" });
    ctx.order().status = "Accepted";
    ctx.order().courier_id = "courier";
    await assert.rejects(ctx.service.updateOrderStatus(42, "requester", "PickedUp"), { code: "NOT_ALLOWED" });
    await assert.rejects(ctx.service.updateOrderStatus(42, "courier", "Cancelled"), { code: "NOT_ALLOWED" });
    assert.equal((await ctx.service.updateOrderStatus(42, "courier", "PickedUp")).status, "PickedUp");
    await assert.rejects(ctx.service.updateOrderStatus(42, "courier", "Completed"), { code: "INVALID_STATE_TRANSITION" });
});

test("a change that lost a race is reported as a conflict", async () => {
    const ctx = await openErrand("Accepted", "courier");
    ctx.model.updateStatus = async () => null;
    await assert.rejects(ctx.service.updateOrderStatus(42, "courier", "PickedUp"), { status: 409, code: "STATE_CHANGED" });
});

test("an errand can be accepted until its needed-by time, not after, and never by its requester", async () => {
    const ctx = await openErrand();
    await assert.rejects(ctx.service.acceptOrder(42, "requester"), { status: 403, code: "OWN_ERRAND" });
    ctx.order().needed_by_time = new Date(Date.now() - 1000);
    await assert.rejects(ctx.service.acceptOrder(42, "courier"), { status: 409, code: "ORDER_NOT_AVAILABLE" });
    assert.equal(ctx.order().status, "Open");
    ctx.order().needed_by_time = new Date(Date.now() + 60_000);
    assert.equal((await ctx.service.acceptOrder(42, "courier")).status, "Accepted");
});

test("an Open errand is visible to everyone, a taken one only to its requester and courier", async () => {
    const ctx = await openErrand();
    assert.deepEqual((await ctx.service.getOrderById(42, "stranger")).allowed_transitions, []);
    assert.deepEqual((await ctx.service.getOrderById(42, "requester")).allowed_transitions, ["Cancelled"]);
    ctx.order().status = "Accepted";
    ctx.order().courier_id = "courier";
    await assert.rejects(ctx.service.getOrderById(42, "stranger"), { status: 404 });
    assert.deepEqual((await ctx.service.getOrderById(42, "courier")).allowed_transitions, ["PickedUp"]);
    assert.deepEqual((await ctx.service.getOrderById(42, "requester")).allowed_transitions, ["Cancelled"]);
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
        return new Response(calls.length === 1 ? JSON.stringify({ status: "Active", open: true, orderable: true }) : "Credits reserved");
    });
    assert.deepEqual(await clients.supplierAvailability("supplier/1", input.neededByTime, "relay_session=valid"), { active: true, open: true });
    await clients.reserve("requester", "42", 5, "relay_session=valid");
    assert.equal(calls[0].url.pathname, "/suppliers/supplier%2F1/availability");
    assert.equal(calls[0].url.searchParams.get("at"), "2099-10-23T04:00:00.000Z");
    assert.equal(new Headers(calls[0].init.headers).get("cookie"), "relay_session=valid");
    assert.equal(calls[1].url.pathname, "/credits/reserve");
    assert.equal(calls[1].init.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { userId: "requester", errandRef: "42", amount: 5 });
    assert.equal(new Headers(calls[1].init.headers).get("cookie"), "relay_session=valid");
});

test("the supplier answer tells missing, inactive and closed apart, and anything unclear is unavailable", async () => {
    const answer = (response: Response) =>
        createServiceClients("http://supplier", "http://credit", async () => response).supplierAvailability("s1", input.neededByTime, "c");
    assert.equal(await answer(new Response("missing", { status: 404 })), null);
    assert.deepEqual(await answer(Response.json({ status: "Inactive", open: true })), { active: false, open: true });
    assert.deepEqual(await answer(Response.json({ status: "Active", open: false })), { active: true, open: false });
    for (const response of [new Response("{}"), new Response("down", { status: 503 })]) {
        await assert.rejects(answer(response), { status: 503, code: "SUPPLIER_SERVICE_UNAVAILABLE" });
    }
    const down = createServiceClients("http://supplier", "http://credit", async () => { throw new TypeError("fetch failed"); });
    await assert.rejects(down.supplierAvailability("s1", input.neededByTime, "c"), { status: 503 });
});

test("a refused reservation names its reason, and a failure or timeout is unavailable", async () => {
    const reserve = (reply: () => Promise<Response>) =>
        createServiceClients("http://supplier", "http://credit", reply).reserve("requester", "42", 5, "c");
    await assert.rejects(reserve(async () => new Response("Insufficient available credits", { status: 400 })), { status: 409, code: "INSUFFICIENT_CREDITS" });
    await assert.rejects(reserve(async () => new Response("Errand reference is closed", { status: 400 })),
        { status: 409, code: "CREDIT_RESERVATION_REFUSED", message: "Errand reference is closed" });
    await assert.rejects(reserve(async () => { throw new TypeError("fetch failed"); }), { status: 503, code: "CREDIT_SERVICE_UNAVAILABLE" });
    await assert.rejects(reserve(async () => { throw new DOMException("The operation timed out", "TimeoutError"); }),
        { status: 503, code: "CREDIT_SERVICE_TIMEOUT" });
});

test("the reservation waits 5 seconds for the credit service", async () => {
    let signal: AbortSignal | undefined;
    const clients = createServiceClients("http://supplier", "http://credit", async (_url, init) => {
        signal = init?.signal ?? undefined;
        return new Response("Credits reserved");
    });
    const started = Date.now();
    await clients.reserve("requester", "42", 5, "c");
    assert.ok(signal && !signal.aborted);
    // AbortSignal.timeout keeps no public duration, so check it is still alive well after 2 seconds would have passed.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(signal.aborted, false, `aborted after ${Date.now() - started} ms`);
});
