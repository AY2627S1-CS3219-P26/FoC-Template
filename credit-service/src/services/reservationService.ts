import { reserveAtomic, debitReserved, creditAvailable, releaseToAvailable } from "../models/database/credit-service/accountsCollection.ts";
import { findActiveReservation, insertReservation, setReservationStatusIfActive } from "../models/database/credit-service/reservationsCollection.ts";
import { insertTransaction } from "../models/database/credit-service/transactionsCollection.ts";
import { withTxn } from "../config/db.ts";

export async function reserveCredits(userId: string, errandRef: string, amount: number): Promise<void> {
    if (amount <= 0 || !Number.isInteger(amount)) throw new Error('Amount must be a positive whole number');
    if (await findActiveReservation(errandRef)) return; // idempotent: this errand is already reserved

    try {
        await withTxn(async (session) => {
            const reserved = await reserveAtomic(userId, amount, session);
            if (!reserved) throw new Error('Insufficient available credits');
            await insertReservation({ userId, errandRef, amount, status: 'active', createdAt: new Date() }, session);
            await insertTransaction({ userId, errandRef, type: 'reservation', amount, createdAt: new Date() }, session);
        });
    } catch (err) {
        // A concurrent duplicate for the same errand won the unique index; its reservation stands
        // and this transaction rolled back the deduction, so returning is the idempotent outcome.
        if ((err as { code?: number }).code === 11000) return;
        throw err;
    }
}

export async function transferCredits(errandRef: string, courierId: string): Promise<void> {
    const reservation = await findActiveReservation(errandRef);
    if (!reservation) return; // idempotent: nothing active to transfer (already transferred or released)

    await withTxn(async (session) => {
        const claimed = await setReservationStatusIfActive(errandRef, 'transferred', session);
        if (!claimed) return; // a concurrent transfer/release already handled this errand
        const debited = await debitReserved(reservation.userId, reservation.amount, session);
        if (!debited) throw new Error('Requester account not found');
        const credited = await creditAvailable(courierId, reservation.amount, session);
        if (!credited) throw new Error('Courier account not found');
        await insertTransaction({ userId: courierId, errandRef, type: 'transfer', amount: reservation.amount, createdAt: new Date() }, session);
    });
}

export async function releaseCredits(errandRef: string): Promise<void> {
    const reservation = await findActiveReservation(errandRef);
    if (!reservation) return; // idempotent: already released or never reserved

    await withTxn(async (session) => {
        const claimed = await setReservationStatusIfActive(errandRef, 'released', session);
        if (!claimed) return;
        const released = await releaseToAvailable(reservation.userId, reservation.amount, session);
        if (!released) throw new Error('Account not found');
        await insertTransaction({ userId: reservation.userId, errandRef, type: 'release', amount: reservation.amount, createdAt: new Date() }, session);
    });
}
