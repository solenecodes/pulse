import { describe, expect, it } from "vitest";
import { codexRequestSchema, loginSchema } from "@/lib/schemas";

describe("zod schemas", () => {
  it("accepts the seeded login shape", () => {
    expect(loginSchema.safeParse({ email: "pm@pulse.test", password: "password123" }).success).toBe(true);
  });

  it("rejects weak login payloads", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "short" }).success).toBe(false);
  });

  it("validates codex skill requests", () => {
    expect(codexRequestSchema.safeParse({ intent: "merchandising", category: "core" }).success).toBe(true);
    expect(codexRequestSchema.safeParse({ intent: "feature-request", category: "core", prompt: "Add product compare." }).success).toBe(true);
    expect(codexRequestSchema.safeParse({ intent: "unknown", category: "core" }).success).toBe(false);
  });
});
