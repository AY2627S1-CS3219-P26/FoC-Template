import type { Request, Response } from "express";
import { ConversationQuerySchema, SendMessageSchema } from "../schemas/message.schema.ts";
import { createMessage, getConversation, getLastMessageBetween, listConversations } from "../services/message.service.ts";

export async function getConversations(_req: Request, res: Response) {
    return res.status(200).json(await listConversations(res.locals.accountId));
}

export async function getLastByUserId(req: Request, res: Response) {
    const accountId: string = res.locals.accountId;
    const otherId = req.params.userId as string;

    return res.status(200).json(await getLastMessageBetween(accountId, otherId));
}

export async function getConversationByIds(req: Request, res: Response) {
    const accountId: string = res.locals.accountId;
    const senderId = req.params.senderId as string;
    const receiverId = req.params.receiverId as string;

    // Refused before the lookup, so the answer does not reveal whether the two have talked.
    if (senderId !== accountId && receiverId !== accountId) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not allowed to do this" } });
    }

    const parsed = ConversationQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_FAILED",
                message: "One or more fields are invalid",
                details: {
                    fields: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
                },
            },
        });
    }

    const otherId = senderId === accountId ? receiverId : senderId;
    return res.status(200).json(await getConversation(accountId, otherId, parsed.data.page, parsed.data.pageSize));
}

export async function send(req: Request, res: Response) {
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_FAILED",
                message: "One or more fields are invalid",
                details: {
                    fields: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
                },
            },
        });
    }

    // The sender is whoever the user-service says is logged in, never what the body claims.
    const message = await createMessage(res.locals.accountId, parsed.data.receiverId, parsed.data.content);
    return res.status(201).json(message);
}
