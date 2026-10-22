import express from "express";
import { getTransactionsByUser, getTransactionsByErrand } from "../controllers/transactionController.ts";

const router = express.Router();

router.get('/user/:userId', getTransactionsByUser);
router.get('/errand/:errandRef', getTransactionsByErrand);

export default router;
