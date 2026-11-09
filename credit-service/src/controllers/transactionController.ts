import type { Request, Response } from "express";
import { getErrorMessage } from "../utils/error.ts";
import { canReadAccount } from "../middleware.ts/auth.ts";
import { findTransactionsByUserId, findTransactionsByErrandRef } from "../models/database/credit-service/transactionsCollection.ts";

export const getTransactionsByUser = async (req: Request, res: Response) => {
    const userId = String(req.params.userId);
    if (!canReadAccount(res.locals.accountId, res.locals.roles, userId)) {
        return res.status(403).send("Forbidden");
    }
    try {
        const transactions = await findTransactionsByUserId(userId);
        res.status(200).send(transactions);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
};

export const getTransactionsByErrand = async (req: Request, res: Response) => {
    try {
        const transactions = await findTransactionsByErrandRef(String(req.params.errandRef));
        res.status(200).send(transactions);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
};
