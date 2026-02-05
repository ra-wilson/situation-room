import OpenAI from "openai";
import { NextResponse } from "next/server";

import { runNewsPipeline } from "@/src/features/news/pipeline/runNewsPipeline";
import { prisma } from "@/src/lib/db";
import { buildCronUnauthorized, isCronAuthorized } from "@/src/lib/cron-auth";
import { runWithCronGuard } from "@/src/lib/cron-guard";

const NEWS_GUARD_KEY = "news-pipeline";
const NEWS_GUARD_TTL_MS = 10 * 60 * 1000;

const buildLlmClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.NEWS_LLM_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  return {
    complete: async (prompt: string) => {
      const response = await client.responses.create({
        model,
        input: prompt,
        temperature: 0.2,
        text: { format: { type: "json_object" } },
      });

      return response.output_text ?? "";
    },
  };
};

export async function POST(request: Request) {
  if (!isCronAuthorized(request, { allowPipelineSecret: true })) {
    return buildCronUnauthorized();
  }

  const guarded = await runWithCronGuard(NEWS_GUARD_KEY, NEWS_GUARD_TTL_MS, async () => {
    const llm = buildLlmClient();
    const metrics = await runNewsPipeline({ prisma, llm: llm ?? undefined });
    return { llmEnabled: Boolean(llm), metrics };
  });

  if (guarded.skipped) {
    return NextResponse.json(
      { error: "Refresh already running" },
      { status: 409 },
    );
  }

  return NextResponse.json(guarded.result);
}
