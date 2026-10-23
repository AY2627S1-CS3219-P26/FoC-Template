import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { connectWithRetry, pool } from "./db.ts";
import { logger } from "./lib/logger.ts";

try {
    await connectWithRetry();
} catch (err) {
    logger.fatal({ err }, "Could not connect to database, exiting");
    process.exit(1);
}

const app = createApp();
const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Order Service listening");
});

async function shutdown(signal: string) {
    logger.info({ signal }, "Shutting down Order Service");
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));