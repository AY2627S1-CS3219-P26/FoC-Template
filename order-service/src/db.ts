import pkg from 'pg';
const { Pool } = pkg;
import { config } from './config.ts';
// import { logger } from './lib/logger.ts';

const MAX_ATTEMPTS = 10;

export const pool = new Pool({
    connectionString: config.DATABASE_URL,
});

export async function connectWithRetry(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
        try {
            const client = await pool.connect();
            client.release();
            // logger.info("connected to PostgreSQL");
            return;
        } catch (err) {
            if (attempt >= MAX_ATTEMPTS) throw err;
            const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
            // logger.warn({ attempt, delayMs }, "PostgreSQL not reachable, retrying");
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}