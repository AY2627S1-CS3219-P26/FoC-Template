import { Schema, model } from "mongoose";
import { lowercase, minLength } from "zod";

export const STATUS = ["read", "unread"];
export const TYPE = ["message", "audio"];

const messageSchema = new Schema(
    {
        userId: { type: String, required: true, minLength: 1, trim: true },
        receiverId: { type: String, required: true, trim: true },
        content: { type: String, required: true, trim: true },
        type: { type: String, enum: TYPE },
        status: { type: String, enum: STATUS, default: "unread" },
        timestamp: { type: Date, default: () => new Date() },
    },
    {
        runValidators: true,
        timestamps: { createdAt: true, updatedAt: true },
        versionKey: false
    }
)

const Message = model("Message", messageSchema);
export default Message;
