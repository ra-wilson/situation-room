type EventInput = {
  id: string;
  lat?: number | null;
  lng?: number | null;
  countries?: string[] | null;
  theatres?: string[] | null;
  title?: string | null;
  summary?: string | null;
};

export type GeoMetrics = {
  updated: number;
  skipped: number;
};

type PrismaLike = {
  event: {
    update: (args: {
      where: { id: string };
      data: {
        lat: number;
        lng: number;
        theatres: string[];
        geoLabel?: string | null;
        geoPrecision?: "country" | "city" | "region" | "unknown" | null;
      };
    }) => Promise<unknown>;
  };
  geoLookup: {
    findUnique: (args: {
      where: { query: string };
    }) => Promise<{ query: string; lat: number; lng: number; label: string } | null>;
    upsert: (args: {
      where: { query: string };
      create: { query: string; lat: number; lng: number; label: string };
      update: { lat: number; lng: number; label: string };
    }) => Promise<unknown>;
  };
};

const COUNTRY_CAPITAL_COORDS: Record<
  string,
  { capital: string; lat: number; lng: number }
> = {
  "United States": { capital: "Washington, D.C.", lat: 38.9072, lng: -77.0369 },
  "United Kingdom": { capital: "London", lat: 51.5074, lng: -0.1278 },
  Russia: { capital: "Moscow", lat: 55.7558, lng: 37.6173 },
  Ukraine: { capital: "Kyiv", lat: 50.4501, lng: 30.5234 },
  China: { capital: "Beijing", lat: 39.9042, lng: 116.4074 },
  Taiwan: { capital: "Taipei", lat: 25.033, lng: 121.5654 },
  Israel: { capital: "Jerusalem", lat: 31.7683, lng: 35.2137 },
  Iran: { capital: "Tehran", lat: 35.6892, lng: 51.389 },
  "North Korea": { capital: "Pyongyang", lat: 39.0392, lng: 125.7625 },
  "South Korea": { capital: "Seoul", lat: 37.5665, lng: 126.978 },
  India: { capital: "New Delhi", lat: 28.6139, lng: 77.209 },
  Pakistan: { capital: "Islamabad", lat: 33.6844, lng: 73.0479 },
  Turkey: { capital: "Ankara", lat: 39.9334, lng: 32.8597 },
};

const DEFAULT_CAPITAL = {
  capital: "Washington, D.C.",
  country: "United States",
  lat: 38.9072,
  lng: -77.0369,
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ??
  "intel-app/1.0 (contact: ops@intel-app.local)";
const NOMINATIM_MIN_DELAY_MS = 1100;
let lastGeocodeAt = 0;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const rateLimitGeocode = async (): Promise<void> => {
  const now = Date.now();
  const waitMs = lastGeocodeAt + NOMINATIM_MIN_DELAY_MS - now;
  if (waitMs > 0) {
    await wait(waitMs);
  }
  lastGeocodeAt = Date.now();
};

type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

const geocode = async (
  prisma: PrismaLike,
  query: string,
): Promise<GeocodeResult | null> => {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  const cached = await prisma.geoLookup.findUnique({
    where: { query: normalized },
  });
  if (cached) {
    console.info("assignGeoToEvents status", {
      status: "geocode_cache_hit",
      query: normalized,
    });
    return { lat: cached.lat, lng: cached.lng, label: cached.label };
  }
  console.info("assignGeoToEvents status", {
    status: "geocode_cache_miss",
    query: normalized,
  });

  try {
    await rateLimitGeocode();

    const url = new URL(NOMINATIM_ENDPOINT);
    url.search = new URLSearchParams({
      q: normalized,
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
    }).toString();

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const match = payload[0];
    if (!match?.lat || !match?.lon || !match.display_name) {
      return null;
    }

    const lat = Number.parseFloat(match.lat);
    const lng = Number.parseFloat(match.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const label = match.display_name;

    await prisma.geoLookup.upsert({
      where: { query: normalized },
      create: { query: normalized, lat, lng, label },
      update: { lat, lng, label },
    });

    return { lat, lng, label };
  } catch {
    return null;
  }
};

const HOTSPOT_QUERIES: Array<{
  keyword: string;
  query: string;
  precision: "city" | "region" | "country";
}> = [
  { keyword: "gaza", query: "Gaza", precision: "region" },
  { keyword: "west bank", query: "West Bank", precision: "region" },
  { keyword: "donbas", query: "Donbas", precision: "region" },
  { keyword: "crimea", query: "Crimea", precision: "region" },
  { keyword: "south china sea", query: "South China Sea", precision: "region" },
  { keyword: "red sea", query: "Red Sea", precision: "region" },
  { keyword: "kashmir", query: "Kashmir", precision: "region" },
  { keyword: "taiwan", query: "Taiwan", precision: "country" },
  { keyword: "iran", query: "Iran", precision: "country" },
  { keyword: "israel", query: "Israel", precision: "country" },
  { keyword: "ukraine", query: "Ukraine", precision: "country" },
  { keyword: "russia", query: "Russia", precision: "country" },
  { keyword: "lebanon", query: "Lebanon", precision: "country" },
  { keyword: "syria", query: "Syria", precision: "country" },
  { keyword: "yemen", query: "Yemen", precision: "country" },
  { keyword: "taipei", query: "Taipei, Taiwan", precision: "city" },
  { keyword: "beijing", query: "Beijing, China", precision: "city" },
  { keyword: "seoul", query: "Seoul, South Korea", precision: "city" },
  { keyword: "pyongyang", query: "Pyongyang, North Korea", precision: "city" },
];

const inferGeoQuery = (
  event: EventInput,
): { query: string; precision: "city" | "region" | "country" } | null => {
  const theatre = event.theatres?.[0]?.trim();
  if (theatre) {
    return { query: theatre, precision: "region" };
  }

  const text = `${event.title ?? ""} ${event.summary ?? ""}`.toLowerCase();
  for (const entry of HOTSPOT_QUERIES) {
    if (text.includes(entry.keyword)) {
      return { query: entry.query, precision: entry.precision };
    }
  }

  return null;
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

    const inferred = inferGeoQuery(event);
    let lat: number | null = null;
    let lng: number | null = null;
    let geoLabel: string | null = null;
    let geoPrecision: "country" | "city" | "region" | "unknown" | null = null;
    let inferredQuery: string | null = inferred?.query ?? null;

    if (inferred) {
      console.info("assignGeoToEvents status", {
        status: "inferred_geo_query",
        eventId: event.id,
        query: inferred.query,
        precision: inferred.precision,
      });
      const geocoded = await geocode(prisma, inferred.query);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        geoLabel = geocoded.label;
        geoPrecision = inferred.precision;
      } else {
        inferredQuery = null;
      }
    }

    if (lat == null || lng == null) {
      const primaryCountry = event.countries?.[0];
      const capital = primaryCountry
        ? COUNTRY_CAPITAL_COORDS[primaryCountry]
        : undefined;
      const resolved = capital ?? DEFAULT_CAPITAL;
      lat = resolved.lat;
      lng = resolved.lng;
      geoLabel = capital
        ? `${resolved.capital}, ${primaryCountry}`
        : `${resolved.capital}, ${DEFAULT_CAPITAL.country}`;
      geoPrecision = primaryCountry ? "country" : "unknown";
    }

    const resolvedLat = lat ?? DEFAULT_CAPITAL.lat;
    const resolvedLng = lng ?? DEFAULT_CAPITAL.lng;
    const theatres =
      event.theatres && event.theatres.length > 0
        ? event.theatres
        : inferredQuery
          ? [inferredQuery]
          : ["Unknown"];

    await prisma.event.update({
      where: { id: event.id },
      data: {
        lat: resolvedLat,
        lng: resolvedLng,
        theatres,
        geoLabel,
        geoPrecision,
      },
    });

    metrics.updated += 1;
  }

  return metrics;
};
