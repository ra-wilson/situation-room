import { NextResponse } from "next/server";
import type { PredictionMarket } from "@/src/features/situation-room/domain/types";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type PolymarketSnapshotPayload = {
  data: PredictionMarket[];
  meta: {
    source: "discovery" | "watchlist";
    generatedAt: string;
    missingCount: number;
  };
};

type PolymarketResponseMeta = {
  status: "ok" | "empty" | "error";
  reason: "snapshot_not_available" | "snapshot_fetch_failed" | null;
  lastUpdated: string | null;
  source: PolymarketSnapshotPayload["meta"]["source"];
  generatedAt: string | null;
  missingCount: number;
};

const buildHeaders = (meta: PolymarketSnapshotPayload["meta"]) =>
  new Headers({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
    "X-Polymarket-Source": meta.source,
    "X-Polymarket-Generated-At": meta.generatedAt,
    "X-Polymarket-Missing-Count": String(meta.missingCount),
  });

export async function GET() {
  try {
    const snapshot = await prisma.polymarketSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!snapshot) {
      const meta: PolymarketResponseMeta = {
        status: "empty",
        reason: "snapshot_not_available",
        lastUpdated: null,
        source: "watchlist",
        generatedAt: null,
        missingCount: 0,
      };

      return NextResponse.json({ data: [], meta });
    }

    const payload = snapshot.payload as PolymarketSnapshotPayload | null;
    const payloadMeta = payload?.meta ?? {
      source: "watchlist" as const,
      generatedAt: snapshot.createdAt.toISOString(),
      missingCount: 0,
    };
    const meta: PolymarketResponseMeta = {
      status: "ok",
      reason: null,
      lastUpdated: snapshot.createdAt.toISOString(),
      source: payloadMeta.source,
      generatedAt: payloadMeta.generatedAt,
      missingCount: payloadMeta.missingCount,
    };

    return NextResponse.json(
      { data: payload?.data ?? [], meta },
      {
        headers: buildHeaders(payloadMeta),
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/polymarket] failed to load snapshot", error);
    const meta: PolymarketResponseMeta = {
      status: "error",
      reason: "snapshot_fetch_failed",
      lastUpdated: null,
      source: "watchlist",
      generatedAt: null,
      missingCount: 0,
    };
    return NextResponse.json({ data: [], meta });
  }
}
