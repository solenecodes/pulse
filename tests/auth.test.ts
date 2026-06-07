import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a matching password", () => {
    const hash = hashPassword("password123", "test-salt");

    expect(verifyPassword("password123", hash)).toBe(true);
    expect(verifyPassword("not-the-password", hash)).toBe(false);
  });
});
