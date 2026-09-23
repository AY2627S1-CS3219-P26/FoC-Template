import type { RequestHandler } from "express";
import { registerUser } from "../services/auth.service.ts";

export const register: RequestHandler = async (req, res) => {
    const user = await registerUser(req.body);
    res.status(201).json(user);
}