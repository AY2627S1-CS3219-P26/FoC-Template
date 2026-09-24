import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { SessionModel } from "../../src/models/session.model.ts";
import { UserModel } from "../../src/models/user.model.ts";

// Gives the calling test file its own empty database for every test.
export function useTestDatabase(): void {
    let server: MongoMemoryServer;

    beforeAll(async () => {
        server = await MongoMemoryServer.create();
        await mongoose.connect(server.getUri());
        // Unique and TTL indexes must exist before the first test relies on them.
        await Promise.all([UserModel.init(), SessionModel.init()]);
    });

    beforeEach(async () => {
        await Promise.all([UserModel.deleteMany({}), SessionModel.deleteMany({})]);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await server.stop();
    });
}