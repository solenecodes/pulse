import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runPulseCopilotSkill } from "@/lib/copilot";
import { prisma } from "@/lib/prisma";
import { copilotRequestSchema } from "@/lib/schemas";

function historyTitle(prompt?: string, fallback = "Copilot change") {
  const cleaned = prompt?.trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;

  return cleaned.length > 64 ? `${cleaned.slice(0, 61)}...` : cleaned;
}

function pendingCopilotResult() {
  return {
    mode: "fallback",
    title: "Copilot is working",
    recommendation: "Copilot is preparing this storefront change.",
    items: []
  };
}

function failedCopilotResult(message: string) {
  return {
    mode: "fallback",
    title: "Copilot failed",
    recommendation: message,
    items: [],
    fallbackReason: message
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = copilotRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Copilot request." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.role !== "product_manager") {
    return NextResponse.json({ error: "Copilot is only available to product managers." }, { status: 403 });
  }

  const existingAction = parsed.data.actionId
    ? await prisma.copilotAction.findFirst({
        where: {
          id: parsed.data.actionId,
          userId: user.id
        }
      })
    : null;

  if (parsed.data.actionId && !existingAction) {
    return NextResponse.json({ error: "Copilot history item not found." }, { status: 404 });
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

    await prisma.copilotAction.update({
      where: { id: existingAction.id },
      data: {
        output: JSON.stringify({
          ...previous,
          status: "in_progress",
          result: pendingCopilotResult()
        })
      }
    });

    try {
      const result = await runPulseCopilotSkill(parsed.data);
      const status = result.fallbackReason ? "failed" : "applied";

      await prisma.copilotAction.update({
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
      const message = error instanceof Error ? error.message : "Copilot request failed.";

      await prisma.copilotAction.update({
        where: { id: existingAction.id },
        data: {
          output: JSON.stringify({
            ...previous,
            status: "failed",
            result: failedCopilotResult(message)
          })
        }
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const action = await prisma.copilotAction.create({
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
        result: pendingCopilotResult()
      })
    }
  });

  try {
    const result = await runPulseCopilotSkill(parsed.data);
    const status = result.fallbackReason ? "failed" : "applied";

    await prisma.copilotAction.update({
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
    const message = error instanceof Error ? error.message : "Copilot request failed.";

    await prisma.copilotAction.update({
      where: { id: action.id },
      data: {
        output: JSON.stringify({
          prompt,
          category,
          imageCount,
          status: "failed",
          version: 1,
          events: [],
          result: failedCopilotResult(message)
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
    return NextResponse.json({ error: "Copilot is only available to product managers." }, { status: 403 });
  }

  const actions = await prisma.copilotAction.findMany({
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
    return NextResponse.json({ error: "Copilot is only available to product managers." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || !body.status || !["applied", "in_progress", "failed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid Copilot history update." }, { status: 400 });
  }

  const action = await prisma.copilotAction.findFirst({
    where: {
      id: body.id,
      userId: user.id
    }
  });

  if (!action) {
    return NextResponse.json({ error: "Copilot history item not found." }, { status: 404 });
  }

  const parsed = JSON.parse(action.output) as Record<string, unknown>;
  await prisma.copilotAction.update({
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
    return NextResponse.json({ error: "Copilot is only available to product managers." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing Copilot action id." }, { status: 400 });
  }

  await prisma.copilotAction.deleteMany({
    where: {
      id,
      userId: user.id
    }
  });

  return NextResponse.json({ ok: true });
}
