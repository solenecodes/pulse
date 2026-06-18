import { describe, expect, it } from "vitest";
import { copilotRequestSchema, loginSchema } from "@/lib/schemas";

describe("zod schemas", () => {
  it("accepts the seeded login shape", () => {
    expect(loginSchema.safeParse({ email: "pm@pulse.test", password: "password123" }).success).toBe(true);
  });

  it("rejects weak login payloads", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "short" }).success).toBe(false);
  });

  it("validates copilot skill requests", () => {
    expect(copilotRequestSchema.safeParse({ intent: "merchandising", category: "core" }).success).toBe(true);
    expect(copilotRequestSchema.safeParse({ intent: "feature-request", category: "core", prompt: "Add product compare." }).success).toBe(true);
    expect(copilotRequestSchema.safeParse({ intent: "unknown", category: "core" }).success).toBe(false);
  });
});
