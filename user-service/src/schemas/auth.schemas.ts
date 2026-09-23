import { z } from "zod";

const NUS_EMAIL = /@(u\.nus\.edu|nus\.edu\.sg)$/;

export const RegisterBody = z.object({
    fullName: z.string().trim().min(1, "is required").max(100),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email("is not a valid email address"))
        .refine((email) => NUS_EMAIL.test(email), "must end with @u.nus.edu or @nus.edu.sg"),
    username: z
        .string()
        .trim()
        .min(3, "must be at least 3 characters")
        .max(30, "must be at most 30 characters")
        .regex(/^[A-Za-z0-9._-]+$/, "may only contain letters, digits, dot, underscore and hyphen"),
    password: z
        .string()
        .min(8, "must be at least 8 characters")
        .max(128, "must be at most 128 characters"),
});

export type RegisterInput = z.infer<typeof RegisterBody>;