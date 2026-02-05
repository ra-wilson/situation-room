import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/db";

type EventDto = {
  id: string;
  title: string | null;
  summary: string | null;
  historicalContext: string | null;
  severity: string | null;
  countries: string[];
  theatres: string[];
  lat: number | null;
  lng: number | null;
  sources: string[];
  updatedAt: string | null;
};

const buildHeaders = () =>
  new Headers({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  });

const toArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { output: { isNot: null } },
      include: { output: true },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
    });

    const data: EventDto[] = events.map((event) => {
      const output = event.output?.payload as
        | {
            summary?: string;
            historicalContext?: string;
            sources?: string[];
          }
        | undefined;

      return {
        id: event.id,
        title: event.title ?? null,
        summary: output?.summary ?? null,
        historicalContext: output?.historicalContext ?? null,
        severity: (event as { severity?: string | null }).severity ?? null,
        countries: toArray((event as { countries?: string[] | null }).countries),
        theatres: toArray((event as { theatres?: string[] | null }).theatres),
        lat: (event as { lat?: number | null }).lat ?? null,
        lng: (event as { lng?: number | null }).lng ?? null,
        sources: toArray(output?.sources),
        updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null,
      };
    });

    return NextResponse.json(data, { headers: buildHeaders() });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/news/events] failed to load events", error);
    return NextResponse.json([], { headers: buildHeaders() });
  }
}
