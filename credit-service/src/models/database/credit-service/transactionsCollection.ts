import { client } from "../../../config/db.ts";
import type { Transaction } from "../../../types/credit.ts";

const database = client.db('credit-service');
const collection = database.collection('transactions');

export async function insertTransaction(transaction: Transaction) {
    return collection.insertOne(transaction);
}

export async function findTransactionsByUserId(userId: string) {
    return collection.find({ userId }).toArray();
}

export async function findTransactionsByErrandRef(errandRef: string) {
    return collection.find({ errandRef }).toArray();
}
