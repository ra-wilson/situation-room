type EventInput = {
  id: string;
  lat?: number | null;
  lng?: number | null;
  countries?: string[] | null;
  theatres?: string[] | null;
};

export type GeoMetrics = {
  updated: number;
  skipped: number;
};

type PrismaLike = {
  event: {
    update: (args: {
      where: { id: string };
      data: { lat: number; lng: number; theatres: string[] };
    }) => Promise<unknown>;
  };
};

const COUNTRY_CAPITALS: Record<string, { lat: number; lng: number }> = {
  "United States": { lat: 38.9072, lng: -77.0369 },
  "United Kingdom": { lat: 51.5074, lng: -0.1278 },
  Russia: { lat: 55.7558, lng: 37.6173 },
  Ukraine: { lat: 50.4501, lng: 30.5234 },
  China: { lat: 39.9042, lng: 116.4074 },
  Taiwan: { lat: 25.033, lng: 121.5654 },
  Israel: { lat: 31.7683, lng: 35.2137 },
  Iran: { lat: 35.6892, lng: 51.389 },
  "North Korea": { lat: 39.0392, lng: 125.7625 },
  "South Korea": { lat: 37.5665, lng: 126.978 },
  India: { lat: 28.6139, lng: 77.209 },
  Pakistan: { lat: 33.6844, lng: 73.0479 },
  Turkey: { lat: 39.9334, lng: 32.8597 },
};

const DEFAULT_CAPITAL = { lat: 38.9072, lng: -77.0369 };

export const assignGeoToEvents = async (
  events: EventInput[],
  prisma: PrismaLike,
): Promise<GeoMetrics> => {
  const metrics: GeoMetrics = { updated: 0, skipped: 0 };

  for (const event of events) {
    if (event.lat != null && event.lng != null) {
      metrics.skipped += 1;
      continue;
    }

    const primaryCountry = event.countries?.[0];
    const centroid = primaryCountry
      ? COUNTRY_CAPITALS[primaryCountry]
      : undefined;

    const lat = centroid?.lat ?? DEFAULT_CAPITAL.lat;
    const lng = centroid?.lng ?? DEFAULT_CAPITAL.lng;
    const theatres =
      centroid || (event.theatres && event.theatres.length > 0)
        ? event.theatres ?? []
        : ["Unknown"];

    await prisma.event.update({
      where: { id: event.id },
      data: { lat, lng, theatres },
    });

    metrics.updated += 1;
  }

  return metrics;
};
