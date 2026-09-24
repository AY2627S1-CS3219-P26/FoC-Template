import mongoose from "mongoose";
import { hashPassword } from "../lib/password.ts";
import { logger } from "../lib/logger.ts";
import { fieldErrorsOf, validationError, type FieldErrors } from "../lib/validation.ts";
import { toPublicUser, UserModel, USERNAME_COLLATION, type PublicUser } from "../models/user.model.ts";
import { RegisterBody } from "../schemas/auth.schemas.ts";
import { randomUUID } from "node:crypto";
import { sendOtpMail } from "../lib/mailer.ts";
import { createOtp } from "../lib/otp.ts";

export async function registerUser(input: unknown): Promise<PublicUser> {
    const parsed = RegisterBody.safeParse(input);
    const fields: FieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);

    const body = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
    for (const field of await findTakenFields(body.email, body.username)) {
        (fields[field] ??= []).push("is already in use");
    }

    if (!parsed.success || Object.keys(fields).length > 0) {
        throw validationError(fields);
    }

    const { password, ...profile } = parsed.data;
    try {
        const id = randomUUID();
        const { code, otp } = createOtp(id);
        const user = await UserModel.create({ _id: id, ...profile, passwordHash: await hashPassword(password), otp });
        logger.info({ accountId: user._id }, "account registered");
        sendOtpMail(user.email, code);
        return toPublicUser(user);
    } catch (err) {
        if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
            const field = Object.keys(err.keyPattern ?? {})[0] ?? "body";
            throw validationError({ [field]: ["is already in use"] });
        }
        throw err;
    }
}

async function findTakenFields(email: unknown, username: unknown): Promise<string[]> {
    const taken: string[] = [];
    if (typeof email === "string" && email.trim() !== "") {
        if (await UserModel.exists({ email: email.trim().toLowerCase() })) {
            taken.push("email");
        }
    }

    if (typeof username === "string" && username.trim() !== "") {
        if (await UserModel.exists({ username: username.trim()} ).collation(USERNAME_COLLATION)) {
            taken.push("username");
        }
    }

    return taken;
}