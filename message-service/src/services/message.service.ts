import { socketServer } from "../index.ts"
import Message, { SYSTEM_SENDER_ID } from "../models/message.model.ts";

const DUPLICATE_KEY = 11000;

export async function messageUser(userId: string) {
    try {
        // Awaited so a failed save reaches the consumer, which then retries instead of acknowledging.
        const message = await Message.create({
            senderId: SYSTEM_SENDER_ID,
            receiverId: userId,
            content: "Welcome to relay. This is a platform where dreams come true. If your dreams involve getting food delivered and getting 50 free credits.",
        });

        socketServer.sendToUser(userId, "receiveMessage", message)
    } catch (err) {
        // A repeated event: the unique index already holds this account's welcome, so there is nothing to do.
        if ((err as { code?: number }).code !== DUPLICATE_KEY) throw err;
    }
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

// Page 1 is the newest messages, since a chat opens at its end. Each page reads oldest first.
export async function getConversation(firstId: string, secondId: string, page: number, pageSize: number) {
    const filter = between(firstId, secondId);
    const [newestFirst, total] = await Promise.all([
        Message.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize),
        Message.countDocuments(filter),
    ]);

    return { items: newestFirst.reverse(), page, pageSize, total };
}
