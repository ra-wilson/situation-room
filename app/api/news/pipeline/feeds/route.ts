import { NextResponse } from "next/server";

import { FEED_URLS } from "@/src/features/news/config";
import { validateFeeds } from "@/src/features/news/ingest/rss";

export async function GET() {
  const { okFeeds, badFeeds } = await validateFeeds(FEED_URLS);
  return NextResponse.json({ okFeeds, badFeeds });
}
