import { client } from "../../../config/db.ts";
import type { CreditAccount } from "../../../types/credit.ts";

const database = client.db('credit-service');
const collection = database.collection('accounts');

export async function insertAccount(account: CreditAccount) {
    return collection.insertOne(account);
}

export async function findAccountByUserId(userId: string) {
    return collection.findOne({ userId });
}

export async function updateBalances(userId: string, available: number, reserved: number) {
    return collection.updateOne(
        { userId },
        { $set: { available, reserved } }
    );
}
