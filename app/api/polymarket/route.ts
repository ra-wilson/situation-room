import { NextResponse } from "next/server";
import type { PredictionMarket } from "@/src/features/situation-room/domain/types";
import { getPolymarketPredictions } from "@/src/features/situation-room/data/polymarket/polymarketClient";

const CACHE_TTL_MS = 120_000;

let cachedPredictions: PredictionMarket[] | null = null;
let cachedAtMs = 0;

const buildHeaders = () =>
  new Headers({
    "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=60",
  });

export async function GET() {
  const now = Date.now();
  if (cachedPredictions && now - cachedAtMs < CACHE_TTL_MS) {
    return NextResponse.json(cachedPredictions, { headers: buildHeaders() });
  }

  try {
    const predictions = await getPolymarketPredictions();
    cachedPredictions = predictions;
    cachedAtMs = now;
    return NextResponse.json(predictions, { headers: buildHeaders() });
  } catch (error) {
    if (cachedPredictions) {
      return NextResponse.json(cachedPredictions, { headers: buildHeaders() });
    }
    return NextResponse.json([], { headers: buildHeaders() });
  }
}
