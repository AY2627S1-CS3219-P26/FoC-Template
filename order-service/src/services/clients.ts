import { AppError } from "../errors.ts";

export type SupplierAvailability = { active: boolean; open: boolean };

function unavailable(service: "supplier" | "credit"): AppError {
    return new AppError(503, `${service.toUpperCase()}_SERVICE_UNAVAILABLE`, `The ${service} service cannot be reached right now, try again later`);
}

export function createServiceClients(supplierUrl: string, creditUrl: string, request: typeof fetch = fetch) {
    function call(url: URL, cookie: string, timeoutMs: number, init: RequestInit = {}) {
        return request(url, {
            ...init,
            headers: { "content-type": "application/json", cookie },
            signal: AbortSignal.timeout(timeoutMs),
        });
    }

    return {
        // null when the supplier does not exist.
        async supplierAvailability(supplierId: string, at: string, cookie: string): Promise<SupplierAvailability | null> {
            const url = new URL(`/suppliers/${encodeURIComponent(supplierId)}/availability`, supplierUrl);
            url.searchParams.set("at", at);
            let response: Response;
            try {
                response = await call(url, cookie, 2000);
            } catch {
                throw unavailable("supplier");
            }
            if (response.status === 404) return null;
            if (!response.ok) throw unavailable("supplier");
            const body = await response.json().catch(() => null) as { status?: unknown; open?: unknown } | null;
            if (typeof body?.open !== "boolean" || typeof body.status !== "string") throw unavailable("supplier");
            return { active: body.status === "Active", open: body.open };
        },

        async reserve(userId: string, errandRef: string, amount: number, cookie: string): Promise<void> {
            let response: Response;
            try {
                response = await call(new URL("/credits/reserve", creditUrl), cookie, 5000, {
                    method: "POST",
                    body: JSON.stringify({ userId, errandRef, amount }),
                });
            } catch (error) {
                if ((error as Error)?.name === "TimeoutError") {
                    throw new AppError(503, "CREDIT_SERVICE_TIMEOUT", "The credit service did not confirm the reservation within 5 seconds, so no errand was created");
                }
                throw unavailable("credit");
            }
            if (response.ok) return;
            // The credit service refuses a reservation with 400 and a plain-text reason.
            if (response.status === 400) {
                const reason = await response.text().catch(() => "");
                if (/insufficient/i.test(reason)) {
                    throw new AppError(409, "INSUFFICIENT_CREDITS", "Your available credits do not cover this reward");
                }
                throw new AppError(409, "CREDIT_RESERVATION_REFUSED", reason || "The credit service refused the reservation");
            }
            throw unavailable("credit");
        },
    };
}
