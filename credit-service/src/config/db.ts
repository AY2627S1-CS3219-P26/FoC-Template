import dotenv from "dotenv";
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGO_URL ?? "mongodb://localhost:27017/credit-service";

const client = new MongoClient(uri);

export async function ensureIndexes() {
    const db = client.db('credit-service');
    await db.collection('accounts').createIndex({ userId: 1 }, { unique: true });
    await db.collection('reservations').createIndex(
        { errandRef: 1 },
        { unique: true, partialFilterExpression: { status: 'active' } }
    );
    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ errandRef: 1 });
}

export async function connectDB() {
    await client.connect();
    await ensureIndexes();
    console.log("MongoDB connected");
}

export async function closeDB() {
    await client.close();
}

export { client };
export default connectDB;
