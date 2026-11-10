# recommendation-service

Credit recommendation service with per-supplier scoring, completed-errand consumption,
and an offline weight trainer. Compose uses an in-memory feature store by default.

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

Other scripts: `npm start` (no watch), `npm run typecheck` (`tsc --noEmit`), `npm test`.
New tests are kept locally under `test/` and ignored by Git; existing tracked tests remain tracked.

## How a recommendation is worked out

We price an errand from the supplier's recent history plus three things about the request:
how many items, how soon it's needed, and how far the delivery is.

If the supplier has fewer than 3 completed errands we don't trust its averages yet, so we just
suggest a flat 10 credits.

Otherwise we start from the supplier's recent average reward (the "market rate") and nudge it:

- more items than this supplier usually gets -> up
- needed soon (within the next 24h) -> up
- delivery farther than usual -> up

Each nudge is how far the request sits from that supplier's own average, times a weight. Add the
nudges to 1, multiply the market rate by it, round, and keep it between 1 and 50.

```
itemFactor     = a * (items / avgItems - 1)
urgencyFactor  = b * urgency            # 0..1, climbs over the last 24h before it's due
distanceFactor = c * (distance / avgDist - 1)
credits        = clamp(round(marketRate * (1 + itemFactor + urgencyFactor + distanceFactor)), 1, 50)
```

So an average-sized, average-distance, not-urgent errand lands on the market rate; anything heavier,
farther, or more urgent costs more. Defaults are `a = 0.5`, `b = 0.5`, `c = 0.3`. The averages and the
weights both update on their own — see below.

## Learning loop (two-speed), both OFF the request path

The request path does one local feature-store read and scores. Nothing below it touches that path.

**Fast cadence (seconds), the market rate.** `order.errand.completed` events are consumed
asynchronously and folded into each supplier's rolling averages (EWMA) in the feature store. The
read path sees fresher numbers on the next request, but never waits on an event.

**Slow cadence, the weights `a` and `c`.** Run `npm run trainer` as a batch job with the
same bucket, region, endpoints and weights table as the service. Scheduling this command is a
deployment responsibility; this repository does not provision a scheduled trainer. It reads
completed-outcome training records from S3, refits the identifiable weights, and writes them to the
`scorer_weights` DynamoDB item (`id = "current"`). The API's `WeightsProvider` polls that item every
~30 min off the request path and swaps them in, so the next request scores with the new weights with
no redeploy and no added latency.

Recommendation logs are buffered in memory and shipped to S3 as newline-delimited JSON objects under
`recommendations/YYYY/MM/DD/`; `record()` is called after the response is sent, so logging never adds
to request latency. Set `S3_BUCKET` to enable it (unset = disabled, for local dev).

Recommendation outputs are predictions and are never training targets. The consumer accepts the
order-service's actual completed payload (`supplierId`, `creditReward`, `itemCount`, `distance`);
`reward` is also accepted for compatibility. The producer publishes the measured route distance
in metres, or null when no route was measured. Null or missing distance is treated as unmeasured.

For a supplier with at least five prior completions and a positive average reward, a sample uses
the statistics from before this completion:

```
rewardOverMarket = completedReward / prior.avgReward - 1
itemFactorInput = prior.avgItems > 0 ? itemCount / prior.avgItems - 1 : 0
distFactorInput = prior.avgDist > 0 ? distance / prior.avgDist - 1 : 0
rewardOverMarket ≈ a * itemFactorInput + c * distFactorInput
```

These item and distance features match the scorer. Missing distance never updates the distance
average as if it were a measured zero. When the prior distance average is zero, the scorer disables
that factor, so the sample can train items with a zero distance feature. If distance is enabled but
the completed outcome has no measurement, the sample is skipped. Measured outcomes can train both
`a` and `c`. Distances use metres, matching recommendation inputs.

The scorer also adds `b * urgency`, which rises from 0 to 1 as the deadline approaches within
24 hours of recommendation time. A completed event's `leadTimeMin` has no defined relationship to that
timestamp and is currently absent. The trainer therefore keeps `b` fixed. Unobserved urgency may
confound the fitted item/distance weights; this fit describes observed completion rewards, not
acceptance probability or an optimal reward. Learning `b` needs a compatible feature captured at
the time the reward was chosen. No such signal is inferred from completion time.

In DynamoDB mode, the statistics update and an event receipt containing the original training sample
are committed in one transaction. Receipts share the feature table using reserved `supplierId` keys
`__event#<eventId>`; no new table or index is required. They are retained for deduplication, so storage
grows with completed events. Conditional writes reject concurrent changes to a supplier's baseline.
On redelivery the consumer reuses the receipt, writes the sample to the stable S3 key
`training/events/<encoded-eventId>.ndjson`, and acknowledges only after that write succeeds. Unlike
buffered recommendation logging, training export is awaited. This supports retry after an interrupted
export without another statistics update or another training observation. In-memory mode has this
behavior only for the life of the process. Pre-existing completions without receipts cannot be fully
deduplicated on historical replay; the previous store retained only the last event id.

The trainer reads only `training/` NDJSON objects, including historical batches, skips malformed
records, and deduplicates records carrying an event id. At least 20 valid samples are required.
Zero features preserve their coefficients; collinear features or non-finite arithmetic preserve the
whole current fit. Estimated coefficients are bounded to [0, 2]. Every run reads the stored weights
first, and insufficient data performs no write. An invalid stored row or failed read aborts the run.
Defaults are used only when the weights item does not yet exist. A conditional write prevents a
concurrent trainer from replacing a newer result based on different weights. The API also rejects
invalid/non-finite weights on refresh and keeps its latest valid values.

For a local endpoint or AWS deployment, configure `FEATURE_STORE=dynamodb`, `DYNAMODB_TABLE`,
`SCORER_WEIGHTS_TABLE`, `S3_BUCKET`, `AWS_REGION`, and optionally `DYNAMODB_ENDPOINT`/`S3_ENDPOINT`.
`npm run trainer` uses exported environment variables; when using the service's `.env` file, run
`node --env-file=.env src/trainer/refit-weights.ts`. Unset `S3_BUCKET` disables logging/export for local
development. The refresh mechanism reads DynamoDB only in DynamoDB mode.

Provision a feature table with string partition key `supplierId`, a weights table with string
partition key `id`, and the S3 bucket. No sort keys are needed. The worker role needs DynamoDB
`GetItem` and `PutItem` on the feature table (including the transaction's two writes and receipt
keys), and `s3:PutObject` on `training/*`. The API needs `dynamodb:GetItem` on both tables and
`s3:PutObject` on `recommendations/*` when request logging is enabled. The trainer needs
`s3:ListBucket` scoped to `training/`, `s3:GetObject` on `training/*`, and DynamoDB `GetItem`/`PutItem`
on the weights table. Supply AWS credentials through the usual SDK provider chain. These resources,
permissions, and a production schedule are not provisioned by the current deployment manifests.

## Deploy (AWS, ap-southeast-1)

Two App Runner services run the same image, differing only by the `ROLE` env var. Both listen on
3006 so App Runner can health check `/health`.

| | API service | Consumer service |
| --- | --- | --- |
| `ROLE` | `api` | `worker` |
| Does | serves `POST /recommendations` | consumes `order.errand.completed`, updates the feature store |
| Env it needs | `FEATURE_STORE=dynamodb`, `DYNAMODB_TABLE`, `SCORER_WEIGHTS_TABLE`, `S3_BUCKET`, `USER_SERVICE_URL`, `AWS_REGION` | `FEATURE_STORE=dynamodb`, `DYNAMODB_TABLE`, `S3_BUCKET`, `BROKER_URL` (Amazon MQ), `AWS_REGION` |

`.github/workflows/deploy-recommendation-service.yml` runs on merge to `dev`: it typechecks and tests,
builds the image, pushes it to ECR tagged `:<sha>` and `:dev`, then triggers a deploy of each service.
Turn OFF App Runner's automatic image deployment so the workflow controls when a deploy happens; point
both services at the `:dev` tag.

GitHub secrets: `AWS_DEPLOY_ROLE_ARN` (OIDC role the workflow assumes), `APP_RUNNER_API_ARN`,
`APP_RUNNER_CONSUMER_ARN`.

## Declaration of AI-assisted work

I drew the architecture myself — the endpoints, the functions that should exist, and how the service talks to the others — and had Claude fill them in one step at a time, reviewing each result.

- **Generate:** Claude was used to write the route handlers, the scoring and feature-store code, the weights trainer and the tests, one step at a time from a plan.
- **Adapt:** Claude was used to wire the per-request distance into the scorer and keep the service in line with the other services' patterns.
- **Debug:** Claude was used to chase down CI lint and test failures.
- **Explain:** Claude was used to explain each change before it was committed.
- **Document:** Claude was used to help write this document, including the scoring explanation above.
