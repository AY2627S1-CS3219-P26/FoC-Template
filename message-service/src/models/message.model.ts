import { Schema, model } from "mongoose";


export const STATUS = ["read", "unread"];

const messageSchema = new Schema(
    {
        senderId: { type: String, required: true, minLength: 1, trim: true },
        receiverId: { type: String, required: true, trim: true },
        content: { type: String, required: true, trim: true },
        status: { type: String, enum: STATUS, default: "unread" },
        timestamp: { type: Date, default: Date.now },
    },
    {
        runValidators: true,
        timestamps: { createdAt: true, updatedAt: true },
        versionKey: false
    }
)

const Message = model("Message", messageSchema);
export default Message;
