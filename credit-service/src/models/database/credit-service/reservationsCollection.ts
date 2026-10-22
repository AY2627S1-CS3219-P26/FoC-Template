import { client } from "../../../config/db.ts";
import type { Reservation } from "../../../types/credit.ts";

const database = client.db('credit-service');
const collection = database.collection('reservations');

export async function insertReservation(reservation: Reservation) {
    return collection.insertOne(reservation);
}

export async function findReservationByErrandRef(errandRef: string) {
    return collection.findOne({ errandRef, status: 'active' });
}

export async function updateReservationStatus(errandRef: string, status: Reservation['status']) {
    return collection.updateOne({ errandRef }, { $set: { status } });
}
