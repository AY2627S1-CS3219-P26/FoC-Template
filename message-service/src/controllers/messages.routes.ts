import type { Request, RequestHandler, Response } from "express";
import Message from "../models/message.model.ts";

export function getLastMessageByUserId(req: Request, res: Response) {

    return res.status(200).json("sup");
}

export function getUnreadMessagesByUserId(req: Request, res: Response) {

    return res.status(200).json("sup");
}

export function test(req: Request, res: Response) {

    return res.status(200).json("sup");
}

export function getConversationByIds(req: Request, res: Response) {

    return res.status(200).json("sup");
}

export async function send(req: Request, res: Response) {


    const { senderId, receiverId, content, type } = req.body;


    const message = await Message.create({
        userId: senderId,
        receiverId,
        content,
        type,
        status: "unread",
    }
    )
    console.log(JSON.stringify(message));


    return res.status(201).json(message);
}
