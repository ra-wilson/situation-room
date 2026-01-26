type ArticleInput = {
  title?: string | null;
  content?: string | null;
  publishedAt?: Date | string | null;
};

export type ClusterMetrics = {
  created: number;
  updated: number;
  skipped: number;
};

type EventCreateArgs = {
  eventKey: string;
  title?: string | null;
  countries: string[];
  theatres: string[];
  severity: "low" | "medium" | "high";
  firstSeenAt: Date;
  lastSeenAt: Date;
};

type EventUpdateArgs = Partial<EventCreateArgs>;

type PrismaLike = {
  event: {
    findUnique: (args: { where: { eventKey: string } }) => Promise<{
      firstSeenAt?: Date | null;
      lastSeenAt?: Date | null;
    } | null>;
    create: (args: { data: EventCreateArgs }) => Promise<unknown>;
    update: (args: {
      where: { eventKey: string };
      data: EventUpdateArgs;
    }) => Promise<unknown>;
  };
};

const COUNTRY_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  {
    canonical: "United States",
    aliases: ["united states", "u.s.", "u.s", "us", "usa", "america"],
  },
  {
    canonical: "United Kingdom",
    aliases: ["united kingdom", "u.k.", "u.k", "uk", "britain", "england"],
  },
  { canonical: "Russia", aliases: ["russia", "russian"] },
  { canonical: "Ukraine", aliases: ["ukraine", "ukrainian"] },
  { canonical: "China", aliases: ["china", "chinese", "beijing"] },
  { canonical: "Taiwan", aliases: ["taiwan", "taipei"] },
  { canonical: "Israel", aliases: ["israel", "israeli"] },
  { canonical: "Iran", aliases: ["iran", "iranian"] },
  { canonical: "North Korea", aliases: ["north korea", "dprk"] },
  { canonical: "South Korea", aliases: ["south korea", "rok"] },
  { canonical: "India", aliases: ["india", "indian"] },
  { canonical: "Pakistan", aliases: ["pakistan", "pakistani"] },
  { canonical: "Turkey", aliases: ["turkey", "turkiye"] },
];

const KEYWORDS = [
  "election",
  "ceasefire",
  "sanctions",
  "missile",
  "airstrike",
  "attack",
  "summit",
  "protest",
  "coup",
  "hostage",
  "trade",
  "border",
  "cyber",
] as const;

const THEATRES: Record<string, string> = {
  "United States": "americas",
  "United Kingdom": "europe",
  Russia: "europe",
  Ukraine: "europe",
  China: "asia-pacific",
  Taiwan: "asia-pacific",
  Israel: "middle-east",
  Iran: "middle-east",
  "North Korea": "asia-pacific",
  "South Korea": "asia-pacific",
  India: "south-asia",
  Pakistan: "south-asia",
  Turkey: "europe",
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDayBucket = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const matchAll = (
  text: string,
  candidates: Array<{ canonical: string; alias: string }>,
): string[] => {
  const matches = candidates
    .map(({ canonical, alias }) => {
      const safe = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${safe}\\b`, "i");
      const index = text.search(regex);
      return index === -1 ? null : { canonical, index };
    })
    .filter(
      (
        value,
      ): value is {
        canonical: string;
        index: number;
      } => value !== null,
    )
    .sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const match of matches) {
    if (!seen.has(match.canonical)) {
      seen.add(match.canonical);
      ordered.push(match.canonical);
    }
  }
  return ordered;
};

export const extractCountries = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const aliasList = COUNTRY_ALIASES.flatMap(({ canonical, aliases }) =>
    aliases.map((alias) => ({ canonical, alias })),
  );
  return matchAll(normalized, aliasList);
};

export const extractKeywords = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const keywordList = KEYWORDS.map((alias) => ({
    canonical: alias,
    alias,
  }));
  return matchAll(normalized, keywordList);
};

export const makeEventKey = (
  primaryCountry: string,
  keyword: string,
  dayBucket: string,
): string => `${slugify(primaryCountry)}:${slugify(keyword)}:${dayBucket}`;

const pickBestTitle = (articles: ArticleInput[]): string | null => {
  const candidates = articles
    .map((article) => ({
      title: article.title?.trim() ?? "",
      publishedAt: toDate(article.publishedAt),
    }))
    .filter((candidate) => candidate.title.length > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const timeA = a.publishedAt?.getTime() ?? 0;
    const timeB = b.publishedAt?.getTime() ?? 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.title.length - a.title.length;
  });

  return candidates[0]?.title ?? null;
};

const mergeCountries = (groups: string[][]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    for (const country of group) {
      if (!seen.has(country)) {
        seen.add(country);
        merged.push(country);
      }
    }
  }
  return merged;
};

const toTheatres = (countries: string[]): string[] => {
  const seen = new Set<string>();
  const theatres: string[] = [];
  for (const country of countries) {
    const theatre = THEATRES[country];
    if (theatre && !seen.has(theatre)) {
      seen.add(theatre);
      theatres.push(theatre);
    }
  }
  return theatres;
};

export const upsertEventsFromArticles = async (
  articles: ArticleInput[],
  prisma: PrismaLike,
): Promise<ClusterMetrics> => {
  const metrics: ClusterMetrics = {
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const grouped = new Map<
    string,
    {
      eventKey: string;
      primaryCountry: string;
      keyword: string;
      countries: string[][];
      articles: ArticleInput[];
      firstSeenAt: Date;
      lastSeenAt: Date;
    }
  >();

  for (const article of articles) {
    const text = `${article.title ?? ""} ${article.content ?? ""}`.trim();
    if (!text) {
      metrics.skipped += 1;
      continue;
    }

    const countries = extractCountries(text);
    const keywords = extractKeywords(text);
    const primaryCountry = countries[0];
    const keyword = keywords[0];

    if (!primaryCountry || !keyword) {
      metrics.skipped += 1;
      continue;
    }

    const publishedAt = toDate(article.publishedAt) ?? new Date();
    const dayBucket = toDayBucket(publishedAt);
    const eventKey = makeEventKey(primaryCountry, keyword, dayBucket);

    const existing = grouped.get(eventKey);
    if (existing) {
      existing.countries.push(countries);
      existing.articles.push(article);
      if (publishedAt < existing.firstSeenAt) {
        existing.firstSeenAt = publishedAt;
      }
      if (publishedAt > existing.lastSeenAt) {
        existing.lastSeenAt = publishedAt;
      }
      continue;
    }

    grouped.set(eventKey, {
      eventKey,
      primaryCountry,
      keyword,
      countries: [countries],
      articles: [article],
      firstSeenAt: publishedAt,
      lastSeenAt: publishedAt,
    });
  }

  for (const group of grouped.values()) {
    const mergedCountries = mergeCountries(group.countries);
    const theatres = toTheatres(mergedCountries);
    const title = pickBestTitle(group.articles);

    const data: EventCreateArgs = {
      eventKey: group.eventKey,
      title,
      countries: mergedCountries,
      theatres,
      severity: "low",
      firstSeenAt: group.firstSeenAt,
      lastSeenAt: group.lastSeenAt,
    };

    const existing = await prisma.event.findUnique({
      where: { eventKey: group.eventKey },
    });

    if (existing) {
      const firstSeenAt = existing.firstSeenAt
        ? existing.firstSeenAt < group.firstSeenAt
          ? existing.firstSeenAt
          : group.firstSeenAt
        : group.firstSeenAt;
      const lastSeenAt = existing.lastSeenAt
        ? existing.lastSeenAt > group.lastSeenAt
          ? existing.lastSeenAt
          : group.lastSeenAt
        : group.lastSeenAt;

      await prisma.event.update({
        where: { eventKey: group.eventKey },
        data: {
          title,
          countries: mergedCountries,
          theatres,
          severity: "low",
          firstSeenAt,
          lastSeenAt,
        },
      });
      metrics.updated += 1;
      continue;
    }

    await prisma.event.create({ data });
    metrics.created += 1;
  }

  return metrics;
};
