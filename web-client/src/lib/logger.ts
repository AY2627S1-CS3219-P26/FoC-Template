import { pino } from "pino";


export const logger = pino({
    level: "info",
    redact: {
        paths: [
            "req.headers.cookie",
            "req.headers.authorization",
            "*.password",
            "*.passwordHash",
            "*.token",
            "*.otp"
        ],
        censor: "[redacted]"
    }
})
