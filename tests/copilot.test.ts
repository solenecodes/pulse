import { describe, expect, it } from "vitest";
import { runPulseCopilotSkill } from "@/lib/copilot";

describe("copilot integration", () => {
  it("returns a useful local fallback when fallback mode is forced", async () => {
    const original = process.env.PULSE_COPILOT_FORCE_FALLBACK;
    process.env.PULSE_COPILOT_FORCE_FALLBACK = "true";

    const result = await runPulseCopilotSkill({ intent: "merchandising", category: "core" });

    process.env.PULSE_COPILOT_FORCE_FALLBACK = original;
    expect(result.mode).toBe("fallback");
    expect(result.recommendation).toContain("Recovery");
    expect(result.items.length).toBeGreaterThan(0);
  });
});
