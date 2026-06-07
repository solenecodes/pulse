import { describe, expect, it } from "vitest";
import { runPulseCodexSkill } from "@/lib/codex";

describe("codex integration", () => {
  it("returns a useful local fallback when fallback mode is forced", async () => {
    const original = process.env.PULSE_CODEX_FORCE_FALLBACK;
    process.env.PULSE_CODEX_FORCE_FALLBACK = "true";

    const result = await runPulseCodexSkill({ intent: "merchandising", category: "core" });

    process.env.PULSE_CODEX_FORCE_FALLBACK = original;
    expect(result.mode).toBe("fallback");
    expect(result.recommendation).toContain("Recovery");
    expect(result.items.length).toBeGreaterThan(0);
  });
});
