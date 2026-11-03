import type { Request, Response } from "express";
import { getErrorMessage } from "../utils/error.ts";
import { findTransactionsByUserId, findTransactionsByErrandRef } from "../models/database/credit-service/transactionsCollection.ts";

export const getTransactionsByUser = async (req: Request, res: Response) => {
    try {
        const transactions = await findTransactionsByUserId(req.params.userId);
        res.status(200).send(transactions);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
};

export const getTransactionsByErrand = async (req: Request, res: Response) => {
    try {
        const transactions = await findTransactionsByErrandRef(req.params.errandRef);
        res.status(200).send(transactions);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
};
