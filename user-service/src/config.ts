import { z } from "zod";

// Validating the .env entries
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    MONGO_URL: z.string().min(1),

    OTP_SECRET: z.string().min(32, "must be at least 32 characters"),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().min(1)
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