import type { RequestHandler } from "express";
import { registerUser } from "../services/auth.service.ts";
import { resendCode, verifyAccount } from "../services/verification.service.ts";

export const register: RequestHandler = async (req, res) => {
    const user = await registerUser(req.body);
    res.status(201).json(user);
}

export const verify: RequestHandler = async (req, res) => {
    const user = await verifyAccount(req.body);
    res.status(200).json(user);
}

export const resend: RequestHandler = async (req, res) => {
    await resendCode(req.body);
    res.status(202).json({ message: "If an unverified account exists for this email, a new code has been sent" });
};