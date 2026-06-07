import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runPulseCodexSkill } from "@/lib/codex";
import { prisma } from "@/lib/prisma";
import { codexRequestSchema } from "@/lib/schemas";

function historyTitle(prompt?: string, fallback = "Codex change") {
  const cleaned = prompt?.trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;

  return cleaned.length > 64 ? `${cleaned.slice(0, 61)}...` : cleaned;
}

function pendingCodexResult() {
  return {
    mode: "fallback",
    title: "Codex is working",
    recommendation: "Codex is preparing this storefront change.",
    items: []
  };
}

function failedCodexResult(message: string) {
  return {
    mode: "fallback",
    title: "Codex failed",
    recommendation: message,
    items: [],
    fallbackReason: message
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = codexRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Codex request." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.role !== "product_manager") {
    return NextResponse.json({ error: "Codex is only available to product managers." }, { status: 403 });
  }

  const existingAction = parsed.data.actionId
    ? await prisma.codexAction.findFirst({
        where: {
          id: parsed.data.actionId,
          userId: user.id
        }
      })
    : null;

  if (parsed.data.actionId && !existingAction) {
    return NextResponse.json({ error: "Codex history item not found." }, { status: 404 });
  }

  const prompt = parsed.data.prompt ?? "";
  const category = parsed.data.category ?? null;
  const imageCount = parsed.data.images?.length ?? 0;

  if (existingAction) {
    const previous = JSON.parse(existingAction.output) as {
      prompt?: string;
      category?: string | null;
      imageCount?: number;
      version?: number;
      events?: string[];
      result?: unknown;
    };
    const previousEvents = Array.isArray(previous.events) ? previous.events : [];

    await prisma.codexAction.update({
      where: { id: existingAction.id },
      data: {
        output: JSON.stringify({
          ...previous,
          status: "in_progress",
          result: pendingCodexResult()
        })
      }
    });

    try {
      const result = await runPulseCodexSkill(parsed.data);
      const status = result.fallbackReason ? "failed" : "applied";

      await prisma.codexAction.update({
        where: { id: existingAction.id },
        data: {
          output: JSON.stringify({
            ...previous,
            prompt: previous.prompt ?? prompt,
            category: previous.category ?? category,
            imageCount: imageCount || previous.imageCount || 0,
            status,
            version: (previous.version ?? 1) + 1,
            events: [...previousEvents, prompt].filter(Boolean).slice(-4),
            result
          })
        }
      });

      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Codex request failed.";

      await prisma.codexAction.update({
        where: { id: existingAction.id },
        data: {
          output: JSON.stringify({
            ...previous,
            status: "failed",
            result: failedCodexResult(message)
          })
        }
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const action = await prisma.codexAction.create({
    data: {
      userId: user.id,
      intent: parsed.data.intent,
      output: JSON.stringify({
        prompt,
        category,
        imageCount,
        status: "in_progress",
        version: 1,
        events: [],
        result: pendingCodexResult()
      })
    }
  });

  try {
    const result = await runPulseCodexSkill(parsed.data);
    const status = result.fallbackReason ? "failed" : "applied";

    await prisma.codexAction.update({
      where: { id: action.id },
      data: {
        output: JSON.stringify({
          prompt,
          category,
          imageCount,
          status,
          version: 1,
          events: [],
          result
        })
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Codex request failed.";

    await prisma.codexAction.update({
      where: { id: action.id },
      data: {
        output: JSON.stringify({
          prompt,
          category,
          imageCount,
          status: "failed",
          version: 1,
          events: [],
          result: failedCodexResult(message)
        })
      }
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.role !== "product_manager") {
    return NextResponse.json({ error: "Codex is only available to product managers." }, { status: 403 });
  }

  const actions = await prisma.codexAction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return NextResponse.json({
    actions: actions.map((action) => {
      const parsed = JSON.parse(action.output) as {
        prompt?: string;
        title?: string;
        category?: string | null;
        imageCount?: number;
        status?: string;
        version?: number;
        events?: string[];
        result?: { title?: string };
      };

      return {
        id: action.id,
        intent: action.intent,
        createdAt: action.createdAt.toISOString(),
        title: historyTitle(parsed.prompt, parsed.result?.title ?? parsed.title),
        prompt: parsed.prompt ?? "",
        category: parsed.category ?? null,
        imageCount: parsed.imageCount ?? 0,
        status: parsed.status ?? "applied",
        version: parsed.version ?? 1,
        events: parsed.events ?? [],
        result: parsed.result ?? parsed
      };
    })
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.role !== "product_manager") {
    return NextResponse.json({ error: "Codex is only available to product managers." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || !body.status || !["applied", "in_progress", "failed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid Codex history update." }, { status: 400 });
  }

  const action = await prisma.codexAction.findFirst({
    where: {
      id: body.id,
      userId: user.id
    }
  });

  if (!action) {
    return NextResponse.json({ error: "Codex history item not found." }, { status: 404 });
  }

  const parsed = JSON.parse(action.output) as Record<string, unknown>;
  await prisma.codexAction.update({
    where: { id: action.id },
    data: {
      output: JSON.stringify({
        ...parsed,
        status: body.status
      })
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.role !== "product_manager") {
    return NextResponse.json({ error: "Codex is only available to product managers." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing Codex action id." }, { status: 400 });
  }

  await prisma.codexAction.deleteMany({
    where: {
      id,
      userId: user.id
    }
  });

  return NextResponse.json({ ok: true });
}
