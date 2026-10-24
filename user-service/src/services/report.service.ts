import mongoose from "mongoose";
import { AppError } from "../errors.ts";
import { logger } from "../lib/logger.ts";
import { fieldErrorsOf, validationError } from "../lib/validation.ts";
import { ReportModel, toFiledReport, type Report } from "../models/report.model.ts";
import { UserModel, type AccountSummary } from "../models/user.model.ts";
import { ListReportsQuery, ReportBody } from "../schemas/reports.schemas.ts";
import { accountSummaries } from "./user.service.ts";

function notFound(): AppError {
    return new AppError(404, "REPORT_NOT_FOUND", "No report with this id");
}

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

// F5.5.4: newest first, optionally only one state or one reported account.
export async function listReports(query: unknown) {
    const parsed = ListReportsQuery.safeParse(query);
    if (!parsed.success) throw validationError(fieldErrorsOf(parsed.error));
    const { page, pageSize, state, reportedId } = parsed.data;
    const filter = {
        ...(state ? { state } : {}),
        ...(reportedId ? { reportedId } : {}),
    };

    const [reports, total] = await Promise.all([
        ReportModel.find(filter)
            .sort({ filedAt: -1, _id: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize),
        ReportModel.countDocuments(filter),
    ]);
    // One lookup for every account on the page, so the dashboard needs no request per row
    const accounts = await accountSummaries(reports.flatMap(accountIdsOf));
    return { items: reports.map((report) => toAdminReport(report, accounts)), page, pageSize, total };
}

export async function getReport(reportId: string): Promise<AdminReport> {
    const report = await ReportModel.findById(reportId);
    if (!report) throw notFound();
    return toAdminReport(report, await accountSummaries(accountIdsOf(report)));
}

function accountIdsOf(report: Report): string[] {
    return [report.reporterId, report.reportedId, ...(report.decision ? [report.decision.byId] : [])];
}

// A report as administrators see it (F1.6.5). An account deleted since then shows as null.
function toAdminReport(report: Report, accounts: Map<string, AccountSummary>) {
    return {
        id: report._id,
        reporter: accounts.get(report.reporterId) ?? null,
        reported: accounts.get(report.reportedId) ?? null,
        errandId: report.errandId,
        reason: report.reason,
        state: report.state,
        filedAt: report.filedAt,
        decision: report.decision
            ? {
                by: accounts.get(report.decision.byId) ?? null,
                justification: report.decision.justification,
                decidedAt: report.decision.decidedAt,
            }
            : null,
    };
}

export type AdminReport = ReturnType<typeof toAdminReport>;
