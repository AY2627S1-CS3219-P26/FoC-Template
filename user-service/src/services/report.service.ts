import mongoose from "mongoose";
import { logger } from "../lib/logger.ts";
import { fieldErrorsOf, validationError } from "../lib/validation.ts";
import { ReportModel, toFiledReport } from "../models/report.model.ts";
import { UserModel } from "../models/user.model.ts";
import { ReportBody } from "../schemas/reports.schemas.ts";

// F1.6.3 and F1.6.4: every refusal names the field it is about.
export async function fileReport(reporterId: string, input: unknown) {
    const parsed = ReportBody.safeParse(input);
    if (!parsed.success) throw validationError(fieldErrorsOf(parsed.error));
    const { reportedId, errandId, reason } = parsed.data;

    if (reportedId === reporterId) {
        throw validationError({ reportedId: ["cannot be your own account"] });
    }
    if (!(await UserModel.exists({ _id: reportedId }))) {
        throw validationError({ reportedId: ["does not exist"] });
    }

    try {
        const report = await ReportModel.create({ reporterId, reportedId, errandId, reason });
        logger.info({ reportId: report._id, reporterId, reportedId, errandId }, "report filed");
        return toFiledReport(report);
    } catch (err) {
        // The unique index decides, so two identical reports sent at once still make only one
        if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
            throw validationError({ errandId: ["has already been reported by you"] });
        }
        throw err;
    }
}
