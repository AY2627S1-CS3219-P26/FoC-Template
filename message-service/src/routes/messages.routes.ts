import { Router } from "express";
import { getConversationByIds, getConversations, getLastByUserId, send } from "../controllers/messages.controller.ts";

export const messagesRouter = Router();


messagesRouter.post("/send", send)

//note to self: userId acts as placeholder value
messagesRouter.get("/conversations", getConversations)
messagesRouter.get("/last-message/:userId", getLastByUserId)
messagesRouter.get("/:senderId/:receiverId", getConversationByIds) // have to be last



export default messagesRouter;
