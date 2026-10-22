import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload, Secret } from "jsonwebtoken";
import jwt from "jsonwebtoken";
dotenv.config();

export const SECRET_KEY: Secret = process.env.JWTKey || "nus";

export interface CustomRequest extends Request {
    token: string | JwtPayload;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        (req as CustomRequest).token = decoded;

        next();
    } catch (err) {
        res.status(401).send('Please authenticate');
    }
};
