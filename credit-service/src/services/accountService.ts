import { findAccountByUserId, insertAccount } from "../models/database/credit-service/accountsCollection.ts";
import { insertTransaction } from "../models/database/credit-service/transactionsCollection.ts";

const INITIAL_CREDITS = 50;

export async function createAccount(userId: string): Promise<void> {
    const existing = await findAccountByUserId(userId);
    if (existing) return; // ponytail: idempotent — repeated announcement is a no-op

    await insertAccount({ userId, available: INITIAL_CREDITS, reserved: 0 });
    await insertTransaction({ userId, type: 'allocation', amount: INITIAL_CREDITS, createdAt: new Date() });
}

export async function getBalance(userId: string) {
    const account = await findAccountByUserId(userId);
    if (!account) throw new Error('Account not found');
    return { available: account.available, reserved: account.reserved, total: account.available + account.reserved };
}
