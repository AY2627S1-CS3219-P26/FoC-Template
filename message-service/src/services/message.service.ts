import { socketServer } from "../index.ts"
import Message from "../models/message.model.ts";

export async function messageUser(userId: string) {

    const message = {
        //_tempId: Date.now().toString() + Math.random().toString(),
        senderId: 0,
        receiverId: userId,
        content: "Welcome to relay. This is a platform where dreams come true. If your dreams involve getting food delivered and getting 50 free credits.",
        status: "unread",
        timestamp: new Date(),
    }
    socketServer.sendToUser(userId, "receiveMessage", message)
}


function between(firstId: string, secondId: string) {
    return {
        $or: [
            { senderId: firstId, receiverId: secondId },
            { senderId: secondId, receiverId: firstId },
        ],
    };
}

export async function createMessage(senderId: string, receiverId: string, content: string) {
    return Message.create({ senderId, receiverId, content, status: "unread" });
}

export async function markConversationAsRead(senderId: string, receiverId: string) {
    const result = await Message.updateMany({ senderId, receiverId, status: "unread" }, { $set: { status: "read" } });
    return result.modifiedCount;
}

export async function getLastMessageBetween(firstId: string, secondId: string) {
    return Message.findOne(between(firstId, secondId)).sort({ createdAt: -1, _id: -1 });
}

export async function getConversation(firstId: string, secondId: string) {
    return Message.find(between(firstId, secondId)).sort({ createdAt: 1, _id: 1 });
}
