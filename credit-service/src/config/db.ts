import dotenv from "dotenv";
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = `mongodb://${process.env.mongodbUsername}:${process.env.mongodbPassword}@localhost:27017/?authSource=admin&appName=credit-service`;

const client = new MongoClient(uri);

export async function ensureIndexes() {
    const db = client.db('credit-service');
    // one credit account per user (F4.1); makes repeated account creation idempotent (F4.1.3)
    await db.collection('accounts').createIndex({ userId: 1 }, { unique: true });
    // at most one active reservation per errand (F4.2.5); partial so transferred/released don't collide
    await db.collection('reservations').createIndex(
        { errandRef: 1 },
        { unique: true, partialFilterExpression: { status: 'active' } }
    );
    // history lookups (F4.5.3)
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
