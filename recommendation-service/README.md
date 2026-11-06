# recommendation-service

Credit recommendation service. Minimal TypeScript + Express skeleton — no database
or broker yet, and not wired into `compose.yaml`.

## Layout

```
recommendation-service/
├── Dockerfile            # node:24-alpine, runs src/index.ts, EXPOSE 3006
├── .dockerignore
├── .env.example          # every env var with safe local placeholders
├── package.json          # express, helmet, pino, zod (+ tsc/pino-pretty dev)
├── tsconfig.json         # same compiler settings as the other services
└── src/
    ├── index.ts          # starts the HTTP server, handles SIGTERM/SIGINT
    ├── app.ts            # builds the Express app (helmet, json, routes)
    ├── config.ts         # validates env with zod, exits on bad config
    ├── lib/
    │   └── logger.ts     # pino logger with redaction
    └── routes/
        └── health.routes.ts  # GET /health -> { status: "ok" }
```

## Run locally

```bash
cd recommendation-service
npm install
cp .env.example .env   # optional; defaults work without it
npm run dev            # watch mode on PORT (default 3006)
```

Then verify:

```bash
curl http://localhost:3006/health
# {"status":"ok"}
```

Other scripts: `npm start` (no watch), `npm run typecheck` (`tsc --noEmit`).

## Learning loop (two-speed), both OFF the request path

The request path does one local feature-store read and scores. Nothing below it touches that path.

**Fast cadence (seconds), the market rate.** `order.errand.completed` events are consumed
asynchronously and folded into each supplier's rolling averages (EWMA) in the feature store. The
read path sees fresher numbers on the next request, but never waits on an event.

**Slow cadence (~30 min), the weights `a`, `b`, `c`.** An EventBridge schedule triggers
`src/trainer/refit-weights.ts` as a batch job (App Runner job, Lambda, or a scheduled task). It reads
the append-only recommendation logs from S3, refits the weights, and writes them to the
`scorer_weights` DynamoDB item (`id = "current"`). The API's `WeightsProvider` polls that item every
~30 min off the request path and swaps them in, so the next request scores with the new weights with
no redeploy and no added latency.

Recommendation logs are buffered in memory and shipped to S3 as newline-delimited JSON objects under
`recommendations/YYYY/MM/DD/`; `record()` is called after the response is sent, so logging never adds
to request latency. Set `S3_BUCKET` to enable it (unset = disabled, for local dev).

`refitWeights()` is a stub that returns the current weights: a real refit needs outcome labels (was
the errand accepted/completed at that credit price?), which these logs do not yet carry. The pipeline
(read S3 -> refit -> write DynamoDB -> API reloads) is wired end to end so only that function changes.
