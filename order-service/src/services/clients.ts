export class ServiceError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export function createServiceClients(supplierUrl: string, creditUrl: string, request: typeof fetch = fetch) {
    async function call(url: URL, cookie: string, init: RequestInit = {}) {
        try {
            return await request(url, {
                ...init,
                headers: { "content-type": "application/json", cookie },
                signal: AbortSignal.timeout(2000),
            });
        } catch {
            throw new ServiceError("DEPENDENCY_UNAVAILABLE", 503);
        }
    }

    return {
        async checkSupplier(supplierId: string, at: string, cookie: string): Promise<void> {
            const url = new URL(`/suppliers/${encodeURIComponent(supplierId)}/availability`, supplierUrl);
            url.searchParams.set("at", at);
            const response = await call(url, cookie);
            if (response.status === 404) throw new ServiceError("SUPPLIER_NOT_FOUND", 400);
            if (!response.ok) throw new ServiceError("SUPPLIER_UNAVAILABLE", 503);
            const availability = await response.json().catch(() => null) as { orderable?: boolean } | null;
            if (availability?.orderable !== true) throw new ServiceError("SUPPLIER_NOT_ORDERABLE", 400);
        },

        async reserve(userId: string, errandRef: string, amount: number, cookie: string): Promise<void> {
            const response = await call(new URL("/credits/reserve", creditUrl), cookie, {
                method: "POST",
                body: JSON.stringify({ userId, errandRef, amount }),
            });
            if (!response.ok) {
                throw new ServiceError("CREDIT_RESERVATION_FAILED", response.status === 400 ? 409 : 503);
            }
        },
    };
}
