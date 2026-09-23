import { z } from "zod";

// Validating the .env entries
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    MONGO_URL: z.string().min(1)
})

// Empty strings count as not set
const rawEnv = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== "")
)

const parsed = EnvSchema.safeParse(rawEnv);

if (!parsed.success) {
    console.error("Invalid environment configuration:\n" + z.prettifyError(parsed.error));
    process.exit(1);
}

export const config = parsed.data;