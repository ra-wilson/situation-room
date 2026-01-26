import { createHash } from "crypto";

type EventInput = {
  id: string;
  title?: string | null;
};

type RawArticleInput = {
  title?: string | null;
  excerpt?: string | null;
  url?: string | null;
  source?: string | null;
};

export type SummaryPayload = {
  title: string;
  summary: string;
  historicalContext: string;
  severity: "low" | "medium" | "high";
  countries: string[];
  theatres: string[];
  sources: string[];
};

export type SummariseResult = {
  skipped: boolean;
  inputHash: string;
  payload: SummaryPayload | null;
};

type LlmClient = {
  complete: (prompt: string) => Promise<string | SummaryPayload>;
};

type PrismaLike = {
  event: {
    update: (args: {
      where: { id: string };
      data: {
        title?: string;
        severity?: string;
        countries?: string[];
        theatres?: string[];
      };
    }) => Promise<unknown>;
  };
  eventOutput: {
    findUnique: (args: { where: { eventId: string } }) => Promise<{
      inputHash?: string | null;
      payload?: SummaryPayload | null;
    } | null>;
    upsert: (args: {
      where: { eventId: string };
      create: { eventId: string; inputHash: string; payload: SummaryPayload };
      update: { inputHash: string; payload: SummaryPayload };
    }) => Promise<unknown>;
  };
};

const allowedSeverity = new Set(["low", "medium", "high"]);

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    list.push(trimmed);
  }
  return list;
};

const toSeverity = (value: unknown): "low" | "medium" | "high" => {
  if (typeof value !== "string") return "low";
  const normalized = value.toLowerCase();
  if (allowedSeverity.has(normalized)) {
    return normalized as "low" | "medium" | "high";
  }
  return "low";
};

const buildInputHash = (articles: RawArticleInput[]): string => {
  const parts = articles
    .map((article) => ({
      url: article.url?.trim() ?? "",
      title: article.title?.trim() ?? "",
    }))
    .filter((item) => item.url && item.title)
    .map((item) => `${item.url}|${item.title}`)
    .sort();
  return createHash("sha256").update(parts.join("||")).digest("hex");
};

const parsePayload = (value: string | SummaryPayload): SummaryPayload | null => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as SummaryPayload;
  } catch {
    return null;
  }
};

const pickFallbackTitle = (
  event: EventInput,
  articles: RawArticleInput[],
): string => {
  if (event.title?.trim()) return event.title.trim();
  for (const article of articles) {
    if (article.title?.trim()) return article.title.trim();
  }
  return "Situation update";
};

const buildPrompt = (
  event: EventInput,
  articles: RawArticleInput[],
): string => {
  const articleLines = articles.map((article, index) => {
    const title = article.title?.trim() ?? "Untitled";
    const excerpt = article.excerpt?.trim() ?? "";
    const url = article.url?.trim() ?? "";
    const source = article.source?.trim() ?? "";
    return [
      `Article ${index + 1}:`,
      `Title: ${title}`,
      excerpt ? `Excerpt: ${excerpt}` : "Excerpt: (none)",
      source ? `Source: ${source}` : "Source: (unknown)",
      url ? `URL: ${url}` : "URL: (missing)",
    ].join("\n");
  });

  return [
    "You are an analyst summarizing geopolitical events for non-experts.",
    "Return ONLY valid JSON with keys: title, summary, historicalContext, severity, countries, theatres, sources.",
    "summary: 4-6 sentences, neutral, plain language.",
    "historicalContext: bulleted timeline of related historical events, 200-350 words max.",
    "severity: low, medium, or high.",
    "countries and theatres: arrays of strings.",
    "sources: only URLs from the provided articles; do not invent any sources.",
    `Event context title: ${event.title ?? "(none)"}`,
    "",
    "Articles:",
    articleLines.join("\n\n"),
  ].join("\n");
};

export const summariseEvent = async (
  event: EventInput,
  articles: RawArticleInput[],
  prisma: PrismaLike,
  llm: LlmClient,
): Promise<SummariseResult> => {
  const inputHash = buildInputHash(articles);
  const existing = await prisma.eventOutput.findUnique({
    where: { eventId: event.id },
  });

  if (existing?.inputHash && existing.inputHash === inputHash) {
    return {
      skipped: true,
      inputHash,
      payload: existing.payload ?? null,
    };
  }

  const prompt = buildPrompt(event, articles);
  const raw = await llm.complete(prompt);
  const parsed = parsePayload(raw);
  if (!parsed) {
    return { skipped: false, inputHash, payload: null };
  }

  const allowedUrls = new Set(
    articles.map((article) => article.url?.trim()).filter(Boolean) as string[],
  );
  const sources = normalizeList(parsed.sources).filter((source) =>
    allowedUrls.has(source),
  );

  const payload: SummaryPayload = {
    title: parsed.title?.trim() || pickFallbackTitle(event, articles),
    summary: parsed.summary?.trim() || "",
    historicalContext: parsed.historicalContext?.trim() || "",
    severity: toSeverity(parsed.severity),
    countries: normalizeList(parsed.countries),
    theatres: normalizeList(parsed.theatres),
    sources,
  };

  await prisma.eventOutput.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, inputHash, payload },
    update: { inputHash, payload },
  });

  await prisma.event.update({
    where: { id: event.id },
    data: {
      title: payload.title,
      severity: payload.severity,
      countries: payload.countries,
      theatres: payload.theatres,
    },
  });

  return { skipped: false, inputHash, payload };
};
