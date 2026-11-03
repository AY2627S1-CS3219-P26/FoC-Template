import { client } from "../../../config/db.ts";
import type { ClientSession } from "mongodb";
import type { Transaction } from "../../../types/credit.ts";

const database = client.db('credit-service');
const collection = database.collection('transactions');

export async function insertTransaction(transaction: Transaction, session?: ClientSession) {
    return collection.insertOne(transaction, { session });
}

export async function findTransactionsByUserId(userId: string) {
    return collection.find({ userId }).toArray();
}

export async function findTransactionsByErrandRef(errandRef: string) {
    return collection.find({ errandRef }).toArray();
}
