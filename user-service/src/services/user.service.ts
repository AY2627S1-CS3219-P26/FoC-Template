import mongoose from "mongoose";
import { AppError } from "../errors.ts";
import { logger } from "../lib/logger.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { fieldErrorsOf, validationError } from "../lib/validation.ts";
import { toAccountSummary, toPublicUser, UserModel, USERNAME_COLLATION, type AccountSummary, type PublicUser, type User } from "../models/user.model.ts";
import { ListUsersQuery, PasswordChangeBody, ProfileUpdateBody } from "../schemas/users.schemas.ts";
import { endAllSessions } from "./session.service.ts";

function notFound(): AppError {
    return new AppError(404, "USER_NOT_FOUND", "No account with this id");
}

export async function listUsers(query: unknown) {
    const parsed = ListUsersQuery.safeParse(query);
    if (!parsed.success) throw validationError(fieldErrorsOf(parsed.error));
    const { page, pageSize } = parsed.data;

    const [users, total] = await Promise.all([
        UserModel.find()
            .sort({ createdAt: 1 })
            .skip((page -1 ) * pageSize)
            .limit(pageSize),
        UserModel.countDocuments()
    ]);
    return { items: users.map(toPublicUser), page, pageSize, total };
}

export async function getUser(accountId: string): Promise<AdminUser> {
    const user = await UserModel.findById(accountId).select("+stateChanges");
    if (!user) throw notFound();
    return toAdminUser(user);
}

// Looks up several accounts in one query. An id without an account (deleted since) is missing from the map.
export async function accountSummaries(ids: string[]): Promise<Map<string, AccountSummary>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await UserModel.find({ _id: { $in: unique } });
    return new Map(users.map((user) => [user._id, toAccountSummary(user)]));
}

// An account as administrators see it: the public fields plus the state history of F1.6.2, newest first.
async function toAdminUser(user: User) {
    const changes = [...user.stateChanges].reverse();
    const actors = await accountSummaries(changes.map((change) => change.actorId));
    return {
        ...toPublicUser(user),
        stateChanges: changes.map((change) => ({
            id: change.changeId,
            from: change.from,
            to: change.to,
            reason: change.reason,
            actor: actors.get(change.actorId) ?? null,
            at: change.at,
        })),
    };
}

export type AdminUser = Awaited<ReturnType<typeof toAdminUser>>;

export async function updateProfile(accountId: string, input: unknown): Promise<PublicUser> {
    const parsed = ProfileUpdateBody.safeParse(input);
    if(!parsed.success) throw validationError(fieldErrorsOf(parsed.error));
    const changes = parsed.data;

    if (changes.username !== undefined) {
        const taken = await UserModel.exists({ username: changes.username, _id: { $ne: accountId }}).collation(USERNAME_COLLATION);
        if (taken) throw validationError({ username: ["is already in use"] });
    }

    try {
        const user = await UserModel.findByIdAndUpdate(accountId, { $set: changes }, { returnDocument: "after" });
        if (!user) throw notFound();
        return toPublicUser(user);
    } catch (err) {
        if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
            throw validationError({ username: ["is already in use"]});
        }
        throw err;
    }
}

export async function changePassword(accountId: string, sessionId: string, input: unknown): Promise<void> {
    const parsed = PasswordChangeBody.safeParse(input);
    if (!parsed.success) throw validationError(fieldErrorsOf(parsed.error));
    const { currentPassword, newPassword } = parsed.data;

    const user = await UserModel.findById(accountId).select("+passwordHash");
    if (!user) throw notFound();
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
        throw validationError({ currentPassword: ["is wrong"]});
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    // End all sessions with the old password (except the one that changed the password)
    await endAllSessions(accountId, sessionId);
    logger.info({ accountId }, "password changed");
}

export async function deleteUser(accountId: string, actorId: string): Promise<void> {
    const user = await UserModel.findById(accountId);
    if (!user) throw notFound();

    // To delete an administrator the role has to be revoked first, which checks the last admin rule
    if (user.roles.includes("administrator")) await revokeAdministrator(accountId, actorId);

    await UserModel.deleteOne({ _id: accountId });
    await endAllSessions(accountId);
    logger.info({ accountId, actorId }, "account deleted");
}

export async function grantAdministrator(accountId: string, actorId: string): Promise<PublicUser> {
    const user = await UserModel.findByIdAndUpdate(
        accountId,
        { $addToSet: { roles: "administrator" }},
        { returnDocument: "after" }
    );
    if (!user) throw notFound();
    logger.info({ accountId, actorId }, "administrator role granted");
    return toPublicUser(user);
}

export async function revokeAdministrator(accountId: string, actorId: string): Promise<PublicUser> {
    const user = await UserModel.findByIdAndUpdate(
        accountId,
        { $pull: { roles: "administrator" }},
        { returnDocument: "after" }
    );
    if (!user) throw notFound();

    // Revoke first, undoing when no admin is left
    // prevents that two administrators revoke each other at the same moment
    const remaining = await UserModel.countDocuments({ roles: "administrator", state: "Active" });
    if (remaining === 0) {
        await UserModel.updateOne({ _id: accountId }, { $addToSet: { roles: "administrator"}});
        throw new AppError(409, "LAST_ADMINISTRATOR", "At least one administrator is needed");
    }

    logger.info({ accountId, actorId }, "administrator role revoked");
    return toPublicUser(user);
}