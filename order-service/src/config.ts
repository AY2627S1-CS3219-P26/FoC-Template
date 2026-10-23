// import { z } from "zod";

// // Validating the environment variables for the Order Service
// const EnvSchema = z.object({
//     NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
//     PORT: z.coerce.number().int().positive().default(3003),
//     LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
//     DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
//     // USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:3001",
// });

// // Filter out empty strings so they count as not set
// const rawEnv = Object.fromEntries(
//     Object.entries(process.env).filter(([, value]) => value !== "")
// );

// const parsed = EnvSchema.safeParse(rawEnv);

// if (!parsed.success) {
//     console.error("Invalid environment configuration:\n" + parsed.error);
//     process.exit(1);
// }

// export const config = parsed.data;

import dotenv from "dotenv";
import { z } from "zod";

// This MUST be called before Zod tries to read process.env
dotenv.config();

const envSchema = z.object({
    PORT: z.string().default("3003"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    LOG_LEVEL: z.string().default("info"),
    DATABASE_URL: z.string(), // This is why it threw the error!
    USER_SERVICE_URL: z.string().default("http://localhost:3001"),
});

export const config = envSchema.parse(process.env);