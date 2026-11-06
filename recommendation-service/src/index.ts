import { createApp, createFeatureStore, createRecommendationLog, createWeightsProvider } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./lib/logger.ts";
import { startErrandConsumer } from "./consumer.ts";

const store = createFeatureStore();
const log = createRecommendationLog();
const weights = createWeightsProvider();

const server = createApp(store, log, weights).listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "recommendation-service listening");
});

void startErrandConsumer(store);

async function shutdown(signal: string) {
    logger.info({ signal }, "shutting down");
    weights.stop();
    await log.stop();
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
