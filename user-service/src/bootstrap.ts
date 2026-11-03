import { config } from "./config.ts";
import { logger } from "./lib/logger.ts";
import { hashPassword } from "./lib/password.ts";
import { UserModel } from "./models/user.model.ts";
import { newAnnouncement } from "./services/announcement.service.ts";

// F1.5.6: without an administrator nobody could promote anyone, so one is
// created from the environment whenever none exists.
export async function ensureAdministrator(): Promise<void> {
    if (await UserModel.exists({ roles: "administrator" })) return;

    const existing = await UserModel.findOne({ email: config.ADMIN_EMAIL }).select("+announcement");
    if (existing) {
        existing.roles = ["member", "administrator"];
        existing.state = "Active";
        existing.otp = undefined;
        if (!existing.announcement) existing.announcement = newAnnouncement();
        await existing.save();
        logger.warn({ accountId: existing._id }, "existing account promoted to administrator");
        return;
    }

    const admin = await UserModel.create({
        fullName: "Administrator",
        email: config.ADMIN_EMAIL,
        username: config.ADMIN_USERNAME,
        passwordHash: await hashPassword(config.ADMIN_PASSWORD),
        roles: ["member", "administrator"],
        state: "Active",
        announcement: newAnnouncement(),
    })
    logger.info({ accountId: admin._id }, "administrator account created");
}