import { z } from "zod";
import type { Prisma } from "@prisma/client";

type EventInput = {
  id: string;
  title?: string | null;
};

type RawArticleInput = {
  title?: string | null;
  url?: string | null;
  source?: string | null;
  publishedAt?: Date | string | null;
};

export type SummaryPayload = {
  summary: string;
  historicalContext: string;
  severity: "low" | "medium" | "high";
  sources: string[];
  location: string | null;
};

export type SummariseResult = {
  skipped: boolean;
  inputHash: string;
  payload: SummaryPayload | null;
  status: "skipped" | "parsed_ok" | "parsed_failed" | "llm_error";
};

type LlmClient = {
  complete: (prompt: string) => Promise<string | SummaryPayload>;
};

type PrismaLike = {
  event: {
    update: (args: {
      where: { id: string };
      data: {
        summary?: string;
        severity?: "low" | "medium" | "high";
        lastSeenAt?: Date;
      };
    }) => Promise<unknown>;
  };
  eventOutput: {
    findUnique: (args: { where: { eventId: string } }) => Promise<{
      inputHash?: string | null;
      payload?: Prisma.JsonValue | null;
    } | null>;
    upsert: (args: {
      where: { eventId: string };
      create: { eventId: string; inputHash: string; payload: SummaryPayload };
      update: { inputHash: string; payload: SummaryPayload };
    }) => Promise<unknown>;
  };
};

const summarySchema = z.object({
  summary: z.string().trim().min(1),
  historicalContext: z.string().trim().min(1),
  severity: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = value.trim().toLowerCase();
      return normalized ? normalized : undefined;
    },
    z.enum(["low", "medium", "high"]),
  ),
  sources: z.array(z.string().trim().min(1)).min(1),
  location: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
      },
      z.union([z.string().trim().min(1), z.null()]),
    )
    .optional(),
});

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return value.toISOString();
};

const buildInputHash = (articles: RawArticleInput[]): string => {
  const parts = articles
    .map((article) => ({
      title: article.title?.trim() ?? "",
      url: article.url?.trim() ?? "",
      publishedAt: toIsoString(article.publishedAt),
    }))
    .filter((item) => item.url && item.title)
    .sort((a, b) => {
      if (a.url !== b.url) return a.url.localeCompare(b.url);
      if (a.title !== b.title) return a.title.localeCompare(b.title);
      return (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "");
    });

  return JSON.stringify(parts);
};

const parsePayload = (value: string | SummaryPayload) => {
  if (typeof value !== "string") {
    return { rawText: JSON.stringify(value), parsed: value };
  }
  try {
    return { rawText: value, parsed: JSON.parse(value) as SummaryPayload };
  } catch {
    return { rawText: value, parsed: null };
  }
};

const summarizeZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

const truncateText = (value: string, max = 300): string =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const normalizeSourceUrl = (value: string): string => {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith("utm_") ||
        key.toLowerCase() === "gclid" ||
        key.toLowerCase() === "fbclid"
      ) {
        parsed.searchParams.delete(key);
      }
    }
    const pathname =
      parsed.pathname.length > 1
        ? parsed.pathname.replace(/\/+$/, "")
        : parsed.pathname;
    parsed.pathname = pathname || "/";
    const query = parsed.searchParams.toString();
    const querySuffix = query ? `?${query}` : "";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${querySuffix}`;
  } catch {
    return raw;
  }
};

const buildPrompt = (
  event: EventInput,
  articles: RawArticleInput[],
): string => {
  const articleLines = articles.map((article, index) => {
    const title = article.title?.trim() ?? "Untitled";
    const url = article.url?.trim() ?? "";
    const source = article.source?.trim() ?? "";
    const publishedAt = toIsoString(article.publishedAt) ?? "Unknown";
    return [
      `Article ${index + 1}:`,
      `Title: ${title}`,
      `PublishedAt: ${publishedAt}`,
      source ? `Source: ${source}` : "Source: (unknown)",
      url ? `URL: ${url}` : "URL: (missing)",
    ].join("\n");
  });

  return [
    "You are an analyst summarizing geopolitical events for non-experts.",
    "You must return ONLY valid JSON matching this schema:",
    '{ "summary": "string", "historicalContext": "string", "severity": "low | medium | high", "sources": ["string"], "location": "string | null" }',
    "Do not include markdown, explanation, or prose. Output JSON only.",
    "summary: 4-6 sentences, neutral, plain language.",
    "historicalContext: bulleted timeline of related historical events, 200-350 words max.",
    "severity must be exactly one of: low | medium | high (lowercase).",
    "Severity rubric:",
    "- low: routine developments, rhetoric, or minor incidents without clear escalation.",
    "- medium: meaningful escalation, significant military moves, new sanctions, or sustained clashes.",
    "- high: major attacks, invasion, war declaration, nuclear escalation, regime change/coup, or imminent large-scale conflict.",
    "sources: array of URL strings; only URLs from the provided articles; do not invent any sources.",
    "location: infer the most specific real-world location mentioned (city, state/province, region, or country).",
    "If multiple locations are mentioned, choose the primary one for the event.",
    "If no location is inferable, return null.",
    `Event context title: ${event.title ?? "(none)"}`,
    "",
    "Articles:",
    articleLines.join("\n\n"),
  ].join("\n");
};

const bumpSeverity = (
  severity: SummaryPayload["severity"],
  event: EventInput,
  articles: RawArticleInput[],
  summary: string,
): SummaryPayload["severity"] => {
  const text = [
    event.title ?? "",
    summary,
    ...articles.map((article) => article.title ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  const mediumKeywords = [
    "airstrike",
    "missile",
    "attack",
    "strike",
    "sanctions escalation",
    "sanctions",
    "taiwan",
    "iran",
    "israel",
  ];
  const highKeywords = [
    "nuclear",
    "war declaration",
    "invasion",
    "regime change",
    "coup",
    "war",
    "imminent invasion",
  ];
  const hasMedium = mediumKeywords.some((keyword) => text.includes(keyword));
  const hasHigh = highKeywords.some((keyword) => text.includes(keyword));
  let nextSeverity = severity;

  if (severity === "low" && (hasMedium || hasHigh)) {
    nextSeverity = "medium";
  }
  if (severity === "medium" && hasHigh) {
    nextSeverity = "high";
  }

  if (nextSeverity !== severity) {
    console.info("summariseEvent status", {
      status: "severity_bumped",
      eventId: event.id,
      from: severity,
      to: nextSeverity,
      reason: hasHigh ? "high_keywords" : "medium_keywords",
    });
  }

  return nextSeverity;
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
    const existingPayload = existing.payload ?? null;
    const parsedExisting = existingPayload
      ? summarySchema.safeParse(existingPayload)
      : null;
    if (parsedExisting?.success && parsedExisting.data.location != null) {
      const payload: SummaryPayload = {
        ...parsedExisting.data,
        location: parsedExisting.data.location ?? null,
      };
      console.info("summariseEvent status", {
        status: "skipped",
        eventId: event.id,
        inputHash,
      });
      await prisma.event.update({
        where: { id: event.id },
        data: {
          summary: parsedExisting.data.summary,
          severity: parsedExisting.data.severity,
          lastSeenAt: new Date(),
        },
      });
      return {
        skipped: true,
        inputHash,
        payload,
        status: "skipped",
      };
    }
  }

  const prompt = buildPrompt(event, articles);
  let raw: string | SummaryPayload;
  try {
    raw = await llm.complete(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "Error";
    console.error("summariseEvent status", {
      status: "llm_error",
      eventId: event.id,
      inputHash,
      error: `${name}: ${message}`,
    });
    return { skipped: false, inputHash, payload: null, status: "llm_error" };
  }

  const { rawText, parsed } = parsePayload(raw);
  const parsedResult = summarySchema.safeParse(parsed);

  if (!parsedResult.success) {
    console.warn("summariseEvent status", {
      status: "parsed_failed",
      eventId: event.id,
      inputHash,
      error: summarizeZodError(parsedResult.error),
      rawSnippet: truncateText(rawText),
    });
    return { skipped: false, inputHash, payload: null, status: "parsed_failed" };
  }

  const allowedRawUrls = new Set(
    articles.map((article) => article.url?.trim()).filter(Boolean) as string[],
  );
  const allowedNormalizedToRaw = new Map<string, string>();
  for (const allowed of allowedRawUrls) {
    const normalized = normalizeSourceUrl(allowed);
    if (normalized && !allowedNormalizedToRaw.has(normalized)) {
      allowedNormalizedToRaw.set(normalized, allowed);
    }
  }
  const sources: string[] = [];
  const seen = new Set<string>();
  for (const source of parsedResult.data.sources) {
    const rawSource = source.trim();
    const normalizedSource = normalizeSourceUrl(rawSource);
    const matchedSource = allowedRawUrls.has(rawSource)
      ? rawSource
      : allowedNormalizedToRaw.get(normalizedSource);
    if (!matchedSource || seen.has(matchedSource)) continue;
    seen.add(matchedSource);
    sources.push(matchedSource);
  }

  if (sources.length === 0) {
    console.warn("summariseEvent status", {
      status: "parsed_failed",
      eventId: event.id,
      inputHash,
      error: "validation_failed: missing allowed sources",
      rawSnippet: truncateText(rawText),
    });
    return { skipped: false, inputHash, payload: null, status: "parsed_failed" };
  }

  const payload: SummaryPayload = {
    summary: parsedResult.data.summary,
    historicalContext: parsedResult.data.historicalContext,
    severity: bumpSeverity(
      parsedResult.data.severity,
      event,
      articles,
      parsedResult.data.summary,
    ),
    sources,
    location: parsedResult.data.location ?? null,
  };

  await prisma.eventOutput.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, inputHash, payload },
    update: { inputHash, payload },
  });

  await prisma.event.update({
    where: { id: event.id },
    data: {
      summary: payload.summary,
      severity: payload.severity,
      lastSeenAt: new Date(),
    },
  });

  console.info("summariseEvent status", {
    status: "parsed_ok",
    eventId: event.id,
    inputHash,
  });

  return { skipped: false, inputHash, payload, status: "parsed_ok" };
};
