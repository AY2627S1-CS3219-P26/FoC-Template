
import type { userInfo } from "os";
import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./lib/logger.ts";

class SocketServer {
    private io: Server;

    constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                methods: ["GET", "POST"],
            },
        });

        logger.info("sup");

        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        this.io.on("connection", (socket: Socket) => {
            logger.info("New socket connected");

            socket.on("typing:start", (payload) => {
                this.io.to(`user:${payload.receiverId}`).emit(
                    "typing:status",
                    { status: "typing" }
                );
            });

            socket.on("typing:stop", (payload) => {
                this.io.to(`user:${payload.receiverId}`).emit(
                    "typing:status",
                    { status: "idle" }
                );
            });

            socket.on("heartbeat", () => {
                socket.emit("heartbeat:ack", {
                    timestamp: Date.now()
                });
            });

            socket.on("disconnect", () => {
                logger.info({ socketId: socket.id }, "Socket disconnected");
            });
        });
    }
}

export default SocketServer;
