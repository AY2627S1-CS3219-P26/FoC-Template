import { z } from "zod";
import { SYSTEM_SENDER_ID } from "../models/message.model.ts";

export const SendMessageSchema = z.object({
    receiverId: z.string().trim().min(1).refine((id) => id !== SYSTEM_SENDER_ID, "Relay cannot receive messages"),
    content: z.string().trim().min(1),
});

export const MarkAsReadSchema = z.object({
    senderId: z.string().trim().min(1),
});

export const ConversationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
