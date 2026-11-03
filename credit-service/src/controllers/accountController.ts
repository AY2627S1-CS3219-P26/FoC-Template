import type { Request, Response } from "express";
import { getErrorMessage } from "../utils/error.ts";
import { createAccount, getBalance } from "../services/accountService.ts";

export const announceAccount = async (req: Request, res: Response) => {
    try {
        await createAccount(req.body.userId);
        res.status(200).send('Account acknowledged');
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
};

export const getAccountBalance = async (req: Request, res: Response) => {
    try {
        const balance = await getBalance(req.params.userId);
        res.status(200).send(balance);
    } catch (error) {
        return res.status(404).send(getErrorMessage(error));
    }
};
