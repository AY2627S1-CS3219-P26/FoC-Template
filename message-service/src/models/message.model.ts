import { Schema, model } from "mongoose";

export const STATUS = ["read", "unread"] as const;
// The sender of messages from Relay itself. Account ids are UUIDs, so it cannot be anyone's id.
export const SYSTEM_SENDER_ID = "0";

const messageSchema = new Schema(
    {
        senderId: { type: String, required: true, minlength: 1, trim: true },
        receiverId: { type: String, required: true, trim: true },
        content: { type: String, required: true, trim: true },
        status: { type: String, enum: STATUS, default: "unread" },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Matches the sort in message.service.ts, so a conversation page needs no in-memory sort.
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ receiverId: 1, status: 1 });
// One welcome per account, however often user.account.activated arrives.
messageSchema.index({ receiverId: 1 }, { unique: true, partialFilterExpression: { senderId: SYSTEM_SENDER_ID } });

const Message = model("Message", messageSchema);

export default Message;
