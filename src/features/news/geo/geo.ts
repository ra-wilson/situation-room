type EventInput = {
  id: string;
  lat?: number | null;
  lng?: number | null;
  countries?: string[] | null;
  theatres?: string[] | null;
  title?: string | null;
  summary?: string | null;
  geoHint?: string | null;
  geoPrecision?: "country" | "city" | "region" | "unknown" | null;
  geoLabel?: string | null;
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

const DEFAULT_CAPITAL = {
  capital: "Washington, D.C.",
  country: "United States",
  lat: 38.9072,
  lng: -77.0369,
};
const DEFAULT_GEO_LABEL = `${DEFAULT_CAPITAL.capital}, ${DEFAULT_CAPITAL.country}`.toLowerCase();

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

const inferGeoQuery = (
  event: EventInput,
): { query: string; precision: "city" | "region" | "country" | "unknown" } | null => {
  const hint = event.geoHint?.trim();
  if (hint) {
    return { query: hint, precision: "unknown" };
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
      const hasHint = Boolean(event.geoHint?.trim());
      const precision = event.geoPrecision ?? null;
      const label = event.geoLabel?.trim().toLowerCase();
      const isDefaultLabel = label ? label === DEFAULT_GEO_LABEL : false;
      if (!hasHint || (precision && precision !== "unknown" && !isDefaultLabel)) {
        metrics.skipped += 1;
        continue;
      }
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
      const primaryCountry = event.countries?.[0]?.trim();
      if (primaryCountry) {
        const capitalQuery = `${primaryCountry} capital`;
        const geocoded = await geocode(prisma, capitalQuery);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
          geoLabel = geocoded.label;
          geoPrecision = "country";
          inferredQuery = capitalQuery;
        }
      }
    }

    if (lat == null || lng == null) {
      lat = DEFAULT_CAPITAL.lat;
      lng = DEFAULT_CAPITAL.lng;
      geoLabel = `${DEFAULT_CAPITAL.capital}, ${DEFAULT_CAPITAL.country}`;
      geoPrecision = "unknown";
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
