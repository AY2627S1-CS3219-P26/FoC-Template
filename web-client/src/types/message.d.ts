import { z } from "zod";

export const messageSchema = z.object({
    _id: z.string(),
    senderId: z.string().min(1),
    receiverId: z.string(),
    content: z.string(),
    status: z.enum(["unread", "read"]),
    timestamp: z.coerce.date().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
});

export type Message = z.infer<typeof messageSchema>;
