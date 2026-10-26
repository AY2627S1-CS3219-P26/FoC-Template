
import type { userInfo } from "os";
import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./lib/logger.ts";
import Message from "./models/message.model.ts";

class SocketServer {
    private io: Server;
    private users = new Map(); // userId -> Set(socketId)

    constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                methods: ["GET", "POST"],
            },
        });

        this.initializeHandlers();
    }

    private initializeHandlers(): void {

        this.io.on("connection", (socket: Socket) => {
            logger.info("New socket connected");

            socket.on('join', (userId) => {
                socket.join(userId); // Join personal room for targeted emits

                if (!this.users.has(userId)) {
                    this.users.set(userId, new Set());
                }
                this.users.get(userId).add(socket.id);

                console.log('User joined with userId:', userId);
                this.io.emit('onlineUsers', Array.from(this.users.keys()));
            });

            socket.on('sendMessage', async (data, callback) => {
                const newMessage = new Message(data);
                await newMessage.save();

                // Emit to receiver's room (targeted)
                this.io.to(data.receiverId).emit('receiveMessage', newMessage);

                // Ack back to sender
                if (typeof callback === 'function') {
                    callback(newMessage);
                }
            });

            socket.on('markAsRead', async ({ senderId, receiverId }) => {
                await Message.updateMany(
                    { senderId, receiverId, read: false },
                    { $set: { read: true } }
                );


                this.io.to(senderId).emit('messagesRead', { readerId: receiverId });
            });


            socket.on('disconnect', () => {
                let disconnectedUserId = null;
                for (const [userId, socketIds] of this.users.entries()) {
                    if (socketIds.has(socket.id)) {
                        socketIds.delete(socket.id);
                        if (socketIds.size === 0) {
                            this.users.delete(userId);
                            disconnectedUserId = userId;
                        }
                        break;
                    }
                }

                // Cleanup for other users
                if (disconnectedUserId) {
                    this.io.emit('onlineUsers', Array.from(this.users.keys()));
                }
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
