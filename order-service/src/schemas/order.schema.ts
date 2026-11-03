import { z } from "zod";

export const CreateOrderSchema = z.object({
    supplierId: z.string().min(1, "Pickup supplier is required"),
    deliveryLocation: z.string().min(2, "Delivery location is required"),
    neededByTime: z.string().datetime({ message: "Needed-by time must be a valid ISO timestamp" }),
    itemLines: z.array(z.string().min(1, "Item line cannot be empty"))
        .min(1, "At least 1 item line is required")
        .max(10, "Cannot have more than 10 item lines"),
    creditReward: z.coerce.number()
        .int("Credit reward must be an integer")
        .min(1, "Credit reward must be at least 1")
        .max(50, "Credit reward cannot exceed 50"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;