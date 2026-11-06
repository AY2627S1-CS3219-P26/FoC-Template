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

## Deploy (AWS, ap-southeast-1)

Two App Runner services run the same image, differing only by the `ROLE` env var. Both listen on
3006 so App Runner can health check `/health`.

| | API service | Consumer service |
| --- | --- | --- |
| `ROLE` | `api` | `worker` |
| Does | serves `POST /recommendations` | consumes `order.errand.completed`, updates the feature store |
| Env it needs | `FEATURE_STORE=dynamodb`, `DYNAMODB_TABLE`, `SCORER_WEIGHTS_TABLE`, `S3_BUCKET`, `USER_SERVICE_URL`, `AWS_REGION` | `FEATURE_STORE=dynamodb`, `DYNAMODB_TABLE`, `BROKER_URL` (Amazon MQ), `AWS_REGION` |

`.github/workflows/deploy-recommendation-service.yml` runs on merge to `dev`: it typechecks and tests,
builds the image, pushes it to ECR tagged `:<sha>` and `:dev`, then triggers a deploy of each service.
Turn OFF App Runner's automatic image deployment so the workflow controls when a deploy happens; point
both services at the `:dev` tag.

GitHub secrets: `AWS_DEPLOY_ROLE_ARN` (OIDC role the workflow assumes), `APP_RUNNER_API_ARN`,
`APP_RUNNER_CONSUMER_ARN`.
