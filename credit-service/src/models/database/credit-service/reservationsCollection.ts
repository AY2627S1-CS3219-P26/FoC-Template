import { client } from "../../../config/db.ts";
import type { ClientSession } from "mongodb";
import type { Reservation } from "../../../types/credit.ts";

const database = client.db('credit-service');
const collection = database.collection('reservations');

export async function insertReservation(reservation: Reservation, session?: ClientSession) {
    return collection.insertOne(reservation, { session });
}

export async function findActiveReservation(errandRef: string) {
    return collection.findOne({ errandRef, status: 'active' });
}

// Move an active reservation to a terminal state, guarded so only one concurrent caller wins
// (modifiedCount is 1 for the winner, 0 for a repeat). This is what makes transfer/release idempotent.
export async function setReservationStatusIfActive(errandRef: string, status: Reservation['status'], session?: ClientSession) {
    const r = await collection.updateOne({ errandRef, status: 'active' }, { $set: { status } }, { session });
    return r.modifiedCount === 1;
}
