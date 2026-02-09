import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/db";

type RouteContext = {
  params: Promise<{ newsId: string }>;
};

type EventOutputPayload = {
  historicalContext?: unknown;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { newsId } = await context.params;
    const event = await prisma.event.findUnique({
      where: { id: newsId },
      include: { output: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const payload = (event.output?.payload ?? null) as EventOutputPayload | null;
    const historicalContext =
      typeof payload?.historicalContext === "string"
        ? payload.historicalContext.trim()
        : "";

    if (historicalContext.length > 0) {
      return NextResponse.json({
        title: event.title ?? undefined,
        context: historicalContext,
        key_dates: [],
        key_figures: [],
      });
    }

    return NextResponse.json({
      title: event.title ?? "Historical Context",
      context:
        "Historical context is not available yet for this event. It should appear after the next successful summarization run.",
      key_dates: [],
      key_figures: [],
    });
  } catch (error) {
    console.error("[api/context/:newsId] failed to load context", error);
    return NextResponse.json(
      { error: "Failed to load historical context" },
      { status: 500 },
    );
  }
}
