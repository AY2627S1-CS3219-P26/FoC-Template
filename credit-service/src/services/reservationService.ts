import { findAccountByUserId, updateBalances } from "../models/database/credit-service/accountsCollection.ts";
import { findReservationByErrandRef, insertReservation, updateReservationStatus } from "../models/database/credit-service/reservationsCollection.ts";
import { insertTransaction } from "../models/database/credit-service/transactionsCollection.ts";

export async function reserveCredits(userId: string, errandRef: string, amount: number): Promise<void> {
    if (amount <= 0 || !Number.isInteger(amount)) throw new Error('Amount must be a positive whole number');

    const existing = await findReservationByErrandRef(errandRef);
    if (existing) return;

    const account = await findAccountByUserId(userId);
    if (!account) throw new Error('Account not found');
    if (account.available < amount) throw new Error('Insufficient available credits');

    await updateBalances(userId, account.available - amount, account.reserved + amount);
    await insertReservation({ userId, errandRef, amount, status: 'active', createdAt: new Date() });
    await insertTransaction({ userId, errandRef, type: 'reservation', amount, createdAt: new Date() });
}

export async function transferCredits(errandRef: string, courierId: string): Promise<void> {
    const reservation = await findReservationByErrandRef(errandRef);
    if (!reservation) throw new Error('No active reservation for errand');

    const courierAccount = await findAccountByUserId(courierId);
    if (!courierAccount) throw new Error('Courier account not found');

    await updateReservationStatus(errandRef, 'transferred');

    const requesterAccount = await findAccountByUserId(reservation.userId);
    if (requesterAccount) {
        await updateBalances(reservation.userId, requesterAccount.available, requesterAccount.reserved - reservation.amount);
    }

    await updateBalances(courierId, courierAccount.available + reservation.amount, courierAccount.reserved);
    await insertTransaction({ userId: courierId, errandRef, type: 'transfer', amount: reservation.amount, createdAt: new Date() });
}

export async function releaseCredits(errandRef: string): Promise<void> {
    const reservation = await findReservationByErrandRef(errandRef);
    if (!reservation) return;

    const account = await findAccountByUserId(reservation.userId);
    if (!account) throw new Error('Account not found');

    await updateReservationStatus(errandRef, 'released');
    await updateBalances(reservation.userId, account.available + reservation.amount, account.reserved - reservation.amount);
    await insertTransaction({ userId: reservation.userId, errandRef, type: 'release', amount: reservation.amount, createdAt: new Date() });
}
