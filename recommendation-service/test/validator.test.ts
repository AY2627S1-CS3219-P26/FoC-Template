import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRecommendationRequest } from "../src/validator.ts";

test("accepts a valid request", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = validateRecommendationRequest({
        supplierId: "sup-1",
        location: "COM1 Level 2",
        neededBy: future,
        items: ["Nasi Lemak", "Teh Tarik"],
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.data.items, ["Nasi Lemak", "Teh Tarik"]);
});

test("returns every error and no recommendation when several rules break at once", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = validateRecommendationRequest({
        supplierId: "",
        location: "A",
        neededBy: past,
        items: [],
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.errors.length, 4);
        assert.ok(result.errors.some((e) => e.includes("supplierId")));
        assert.ok(result.errors.some((e) => e.includes("location")));
        assert.ok(result.errors.some((e) => e.includes("neededBy")));
        assert.ok(result.errors.some((e) => e.includes("items")));
    }
    assert.ok(!("data" in result));
});
