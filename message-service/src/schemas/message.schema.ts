import { z } from "zod";

export const SendMessageSchema = z.object({
    receiverId: z.string().trim().min(1),
    content: z.string().trim().min(1),
});

export const MarkAsReadSchema = z.object({
    senderId: z.string().trim().min(1),
});
