import { randomUUID } from "node:crypto";
import { Schema, model, type InferSchemaType } from "mongoose";

export const ROLES = ["member", "administrator"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATES = ["PendingVerification", "Active", "Suspended"] as const;
export type AccountState = (typeof ACCOUNT_STATES)[number];

// Usernames are unique regardless of case
export const USERNAME_COLLATION = { locale: "en", strength: 2 } as const;

const userSchema = new Schema(
    {
        _id: { type: String, default: () => randomUUID() },
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        username: { type: String, required: true, trim: true },
        passwordHash: { type: String, required: true, select: false },
        roles: { type: [{ type: String, enum: ROLES }], default: ["member"] },
        state: { type: String, enum: ACCOUNT_STATES, default: "PendingVerification" }
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
        versionKey: false
    }
)

userSchema.index({ email: 1}, { unique: true })
userSchema.index({ username: 1 }, { unique: true, collation: USERNAME_COLLATION });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);

export function toPublicUser(user: User) {
    return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        roles: user.roles,
        state: user.state,
        createdAt: user.createdAt,
    }
}

export type PublicUser = ReturnType<typeof toPublicUser>;