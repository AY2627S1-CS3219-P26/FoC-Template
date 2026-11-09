// Mirrors the message JSON of message-service (models/message.model.ts). Change both together.

export type MessageStatus = 'unread' | 'read'

export type Message = {
  _id: string
  senderId: string
  receiverId: string
  content: string
  status: MessageStatus
  createdAt: string
  updatedAt: string
}

export type Conversation = {
  otherId: string
  lastMessage: Message
  unread: number
}

// What a socket acknowledgement carries when the service refused the event.
export type SocketError = { error: { code: string; message: string } }
