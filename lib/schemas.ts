import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128)
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(24).default(1)
});

export const copilotRequestSchema = z.object({
  intent: z.enum(["merchandising", "product-copy", "qa", "feature-request"]),
  prompt: z.string().min(3).max(1200).optional(),
  category: z.enum(["core", "zero", "recovery", "limited"]).optional(),
  actionId: z.string().min(1).max(80).optional(),
  images: z
    .array(
      z.object({
        name: z.string().min(1).max(180),
        dataUrl: z.string().startsWith("data:image/").max(8_000_000)
      })
    )
    .max(4)
    .optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CopilotRequestInput = z.infer<typeof copilotRequestSchema>;
