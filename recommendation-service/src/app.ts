import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health.routes.ts";
import { createRecommendationsRouter } from "./routes/recommendations.routes.ts";
import { InMemoryFeatureStore, type FeatureStore } from "./feature-store.ts";
import { DynamoFeatureStore } from "./dynamo-feature-store.ts";
import { config } from "./config.ts";

export function createFeatureStore(): FeatureStore {
    if (config.FEATURE_STORE === "dynamodb") {
        return new DynamoFeatureStore({
            tableName: config.DYNAMODB_TABLE,
            region: config.AWS_REGION,
            endpoint: config.DYNAMODB_ENDPOINT,
        });
    }
    return new InMemoryFeatureStore();
}

export function createApp(store: FeatureStore = createFeatureStore()) {
    const app = express();

    app.use(helmet());
    app.use(express.json({ limit: "10kb" }));

    app.use(healthRouter);
    app.use(createRecommendationsRouter(store));

    return app;
}
