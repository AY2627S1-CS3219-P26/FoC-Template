import { socketServer } from "../index.ts"




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
