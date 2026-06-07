import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { products } from "@/lib/products";
import type { CodexRequestInput } from "@/lib/schemas";

type CodexResult = {
  mode: "sdk" | "fallback";
  title: string;
  recommendation: string;
  items: string[];
  fallbackReason?: string;
};

function promptSummary(prompt?: string) {
  return prompt?.trim().replace(/\s+/g, " ").slice(0, 180);
}

function safeImageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "codex-image.png";
}

async function writeCodexImages(input: CodexRequestInput) {
  if (!input.images?.length) return [];

  const dir = path.join(process.cwd(), ".codex", "tmp", "codex-images");
  await fs.mkdir(dir, { recursive: true });

  const paths: string[] = [];

  for (const image of input.images) {
    const match = image.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
    if (!match) continue;

    const [, mimeType, base64] = match;
    const extension = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpg" : mimeType.replace("image/", "");
    const filename = `${randomUUID()}-${safeImageName(image.name).replace(/\.[^.]+$/, "")}.${extension}`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, Buffer.from(base64, "base64"));
    paths.push(filePath);
  }

  return paths;
}

async function removeCodexImages(paths: string[]) {
  await Promise.all(paths.map((filePath) => fs.unlink(filePath).catch(() => undefined)));
}

function localRecommendation(input: CodexRequestInput): CodexResult {
  const scoped = input.category ? products.filter((product) => product.category === input.category) : products;
  const names = scoped.slice(0, 3).map((product) => product.name);
  const summary = promptSummary(input.prompt);

  if (input.intent === "qa") {
    return {
      mode: "fallback",
      title: "QA pass",
      recommendation: "Check category filtering, auth state, and cart persistence before demo.",
      items: ["Run the product filter tests", "Verify login cookie creation", "Confirm footer and hero remain unchanged"]
    };
  }

  if (input.intent === "product-copy") {
    return {
      mode: "fallback",
      title: "Copy direction",
      recommendation: "Keep labels short and sensory, with one clear flavor effect per can.",
      items: names.length ? names : ["Origin", "Zero", "Recovery"]
    };
  }

  if (input.intent === "feature-request") {
    return {
      mode: "fallback",
      title: "Feature draft",
      recommendation: summary
        ? `I would scope this as a focused storefront change: "${summary}". Start with the smallest visible interaction, then wire server persistence only if the feature needs saved state.`
        : "Describe the feature you want to add, then I can turn it into a scoped implementation plan.",
      items: [
        "Identify the UI surface and the user role that should see it",
        "Add the smallest component/state change first",
        "Protect any server route with the same role checks as the UI"
      ]
    };
  }

  return {
    mode: "fallback",
    title: "Merchandising cue",
    recommendation: "Lead with Recovery in the hero, then let the category tabs behave like a premium editorial catalog.",
    items: names.length ? names : ["Pulse Origin", "White Volt Zero", "Recovery Mineral"]
  };
}

export async function runPulseCodexSkill(input: CodexRequestInput): Promise<CodexResult> {
  if (process.env.PULSE_CODEX_FORCE_FALLBACK === "true") {
    return localRecommendation(input);
  }

  const imagePaths = await writeCodexImages(input);

  try {
    const { Codex } = await import("@openai/codex-sdk");
    const client = new Codex();
    const category = input.category ? ` for ${input.category}` : "";
    const freeformPrompt = input.prompt ? `\n\nProduct manager request:\n${input.prompt}` : "";
    const imageInstruction = imagePaths.length
      ? "\n\nUse the attached image(s) as visual context. Refer to visible UI, layout, text, and styling details when relevant."
      : "";
    const thread = client.startThread({
      ...(process.env.CODEX_MODEL ? { model: process.env.CODEX_MODEL } : {}),
      sandboxMode: "workspace-write",
      workingDirectory: process.cwd(),
      skipGitRepoCheck: true
    });
    const response = await thread.run([
      {
        type: "text",
        text: `You are working in the Pulse premium energy drink ecommerce app repository. For this ${input.intent} request${category}, inspect the local project and directly implement the requested storefront change when it is safe and specific enough. Keep the existing premium visual style, avoid unrelated refactors, and preserve tests. If the request is ambiguous or cannot be implemented, explain the blocker briefly instead of only giving a plan.${freeformPrompt}${imageInstruction}`
      },
      ...imagePaths.map((filePath) => ({ type: "local_image" as const, path: filePath }))
    ]);
    const fallback = localRecommendation(input);

    return {
      mode: response.finalResponse ? "sdk" : "fallback",
      title: response.finalResponse ? "Codex result" : fallback.title,
      recommendation: response.finalResponse || fallback.recommendation,
      items: response.finalResponse ? [] : fallback.items
    };
  } catch (error) {
    const fallback = localRecommendation(input);
    const message = error instanceof Error ? error.message : "Codex SDK request failed.";

    return {
      ...fallback,
      fallbackReason: message
    };
  } finally {
    await removeCodexImages(imagePaths);
  }
}
