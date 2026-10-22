import { Router } from "express";
import { getConversationByIds, getLastMessageByUserId, getUnreadMessagesByUserId, send } from "../controllers/messages.routes.ts";

export const messagesRouter = Router();

//note to self: userId acts as placeholder value
messagesRouter.get("/last-message/:userId", getLastMessageByUserId)
messagesRouter.get("/:senderId/:userId", getConversationByIds)
messagesRouter.get("unread/:userId", getUnreadMessagesByUserId)
messagesRouter.get("test", getUnreadMessagesByUserId)

messagesRouter.post("/send", send)


export default messagesRouter;
