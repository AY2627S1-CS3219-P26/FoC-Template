import { z } from "zod";
import { ROLES } from "../models/user.model.ts";
import { FullName, Password, Username } from "./auth.schemas.ts";

// strictObject rejects every other field, so email, roles and state cannot be
// changed through a profile update
export const ProfileUpdateBody = z
    .strictObject({
        fullName: FullName.optional(),
        username: Username.optional()
    })
    .refine((body) => body.fullName !== undefined || body.username !== undefined, {
        message: "must contain fullName or username"
    });

export const PasswordChangeBody = z.object({
    currentPassword: z.string().min(1, "is required"),
    newPassword: Password
})

export const ListUsersQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const AuthorizeBody = z.object({
    token: z.string().min(1),
    requiredRole: z.enum(ROLES).default("member")
})