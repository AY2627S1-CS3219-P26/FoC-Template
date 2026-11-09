# Order service

Owns errand creation and lifecycle state. Uses Node 24, Express and PostgreSQL.

From the repository root, run `docker compose up --build`. The service is at
`http://localhost:3003`, credit-service is at `http://localhost:3004`, and the
browser gateway forwards `/api/order/orders` to this service. `GET /health` is public.
The order tables are created on startup; existing data is preserved.

Every `/orders` request needs the `relay_session` cookie from user-service login.
Order-service asks user-service to authorize the session as a member, then uses
the returned account id. Supplier and credit HTTP requests forward the same cookie.

Creation checks `/suppliers/{id}/availability?at=<neededByTime>` and refuses a
missing, inactive or closed supplier. It saves a Pending order, reserves the
reward through `POST /credits/reserve`, then opens the order. A failed reservation
cancels it. Only Open orders appear in `GET /orders/open` and can be accepted.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/orders` | Create with `supplierId`, `deliveryLocation`, `neededByTime`, `itemLines`, `creditReward` |
| GET | `/orders/open` | Browse open orders |
| GET | `/orders/:id` | Read an order |
| POST | `/orders/:id/accept` | Assign the authenticated courier |
| PATCH | `/orders/:id/status` | Change lifecycle status using `{ "status": "PickedUp" }`, for example |

Completed requests a credit transfer to the assigned courier. Cancelled and
Expired request release to the requester. These use a transactional PostgreSQL
outbox and RabbitMQ; a credit or broker outage leaves the event waiting for retry.
The credit consumer reuses its existing idempotent transfer/release operations.
See [the event catalog](../docs/events.md). The broker publisher follows
`user-service/src/broker.ts` from this repository.

A release closes its errand reference in credit-service even if it arrives before
reservation. A Pending order left by a crash is cancelled after one minute. Creation
is not an atomic transaction across PostgreSQL and MongoDB: recovery is eventual,
and retrying a POST creates another order. An Open order that nobody accepted by its needed-by time is set to Expired
automatically, which releases its reward. Users cannot set Expired themselves.

For local development, run the dependencies in Compose, set the variables in
the root `.env.example`, then run `npm ci` and `npm run dev` in `order-service`.
Run the focused tests from the repository root:

```sh
node --experimental-test-module-mocks --test order-service/test/*.test.ts credit-service/test/*.test.ts
```
