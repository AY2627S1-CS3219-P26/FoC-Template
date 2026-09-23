import mongoose from "mongoose";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { connectWithRetry } from "./db.ts";
import { logger } from "./lib/logger.ts";

try {
    await connectWithRetry();
} catch(err) {
    logger.fatal({ err }, "could not connect to MongoDB, exiting");
    process.exit(1);
}


const server = createApp().listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "user-service listening");
})

async function shutdown(signal: string) {
    logger.info({ signal }, "shutting down");
    await new Promise((resolve) => server.close());
    await mongoose.disconnect();
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));