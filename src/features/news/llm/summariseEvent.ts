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
    z.enum(["low", "medium", "high"]).default("low"),
  ),
  sources: z.array(z.string().trim().min(1)).min(1),
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
    '{ "summary": "string", "historicalContext": "string", "severity": "low | medium | high", "sources": ["string"] }',
    "Do not include markdown, explanation, or prose. Output JSON only.",
    "summary: 4-6 sentences, neutral, plain language.",
    "historicalContext: bulleted timeline of related historical events, 200-350 words max.",
    "severity: low, medium, or high.",
    "sources: array of URL strings; only URLs from the provided articles; do not invent any sources.",
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
    const existingPayload = existing.payload ?? null;
    const parsedExisting = existingPayload
      ? summarySchema.safeParse(existingPayload)
      : null;
    if (parsedExisting?.success) {
      console.info("summariseEvent status", {
        status: "skipped",
        eventId: event.id,
        inputHash,
      });
      return {
        skipped: true,
        inputHash,
        payload: parsedExisting.data,
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

  const allowedUrls = new Set(
    articles.map((article) => article.url?.trim()).filter(Boolean) as string[],
  );
  const sources: string[] = [];
  const seen = new Set<string>();
  for (const source of parsedResult.data.sources) {
    const url = source.trim();
    if (!allowedUrls.has(url) || seen.has(url)) continue;
    seen.add(url);
    sources.push(url);
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
    severity: parsedResult.data.severity,
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
