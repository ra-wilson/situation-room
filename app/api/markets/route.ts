import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/markets] failed to load snapshot", error);
    return NextResponse.json({
      data: [],
      meta: {
        status: "error",
        reason: "snapshot_fetch_failed",
        lastUpdated: null,
      },
    });
  }
}
