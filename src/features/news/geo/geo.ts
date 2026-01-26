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

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "United States": { lat: 39.7837304, lng: -100.4458825 },
  "United Kingdom": { lat: 55.378051, lng: -3.435973 },
  Russia: { lat: 61.52401, lng: 105.318756 },
  Ukraine: { lat: 48.379433, lng: 31.16558 },
  China: { lat: 35.86166, lng: 104.195397 },
  Taiwan: { lat: 23.69781, lng: 120.960515 },
  Israel: { lat: 31.046051, lng: 34.851612 },
  Iran: { lat: 32.427908, lng: 53.688046 },
  "North Korea": { lat: 40.339852, lng: 127.510093 },
  "South Korea": { lat: 35.907757, lng: 127.766922 },
  India: { lat: 20.593684, lng: 78.96288 },
  Pakistan: { lat: 30.375321, lng: 69.345116 },
  Turkey: { lat: 38.963745, lng: 35.243322 },
};

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
      ? COUNTRY_CENTROIDS[primaryCountry]
      : undefined;

    const lat = centroid?.lat ?? 0;
    const lng = centroid?.lng ?? 0;
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
