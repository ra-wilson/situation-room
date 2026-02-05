import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await prisma.marketSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!snapshot) {
    return NextResponse.json({
      data: [],
      meta: {
        status: "empty",
        reason: "snapshot_not_available",
        lastUpdated: null,
      },
    });
  }

  const payload = snapshot.payload as { data?: unknown; updatedAt?: string } | null;

  const lastUpdated = snapshot.createdAt.toISOString();

  return NextResponse.json(
    {
      data: payload?.data ?? [],
      meta: {
        status: "ok",
        reason: null,
        lastUpdated,
      },
    },
    {
      headers: {
        "x-markets-updated": lastUpdated,
      },
    },
  );
}
