import { createApp, createFeatureStore } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./lib/logger.ts";
import { startErrandConsumer } from "./consumer.ts";

const store = createFeatureStore();

const server = createApp(store).listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "recommendation-service listening");
});

void startErrandConsumer(store);

async function shutdown(signal: string) {
    logger.info({ signal }, "shutting down");
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
