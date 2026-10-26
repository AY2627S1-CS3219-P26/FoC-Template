import mongoose from "mongoose";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./lib/logger.ts";
import SocketServer from "./webSocket.ts";
import { connectToDBWithRetry } from "./db.ts";

try {
    //await connectToDBWithRetry();
} catch (err) {
    logger.fatal({ err }, "could not start, exiting");
    process.exit(1);
}


const server = createApp().listen(config.PORT, () => {
    logger.info(
        { port: config.PORT },
        "message-service listening"
    );
});

const socketServer = new SocketServer(server);

async function shutdown(signal: string) {
    logger.info({ signal }, "shutting down");
    await new Promise((resolve) => server.close(resolve));
    //await socketServer.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
