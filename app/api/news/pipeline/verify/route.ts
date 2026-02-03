import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/db";

export async function GET() {
  const [eventsTotal, eventsWithOutput, latest] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { output: { isNot: null } } }),
    prisma.event.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { output: true },
    }),
  ]);

  const latestOutputs = latest.map((event) => ({
    id: event.id,
    title: event.title ?? null,
    updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null,
    payload: event.output?.payload ?? null,
  }));

  return NextResponse.json({ eventsTotal, eventsWithOutput, latestOutputs });
}
