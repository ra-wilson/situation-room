import OpenAI from "openai";
import { NextResponse } from "next/server";

import { runNewsPipeline } from "@/src/features/news/pipeline/runNewsPipeline";
import { prisma } from "@/src/lib/db";

const getPipelineSecret = (): string => process.env.PIPELINE_SECRET ?? "";

const buildUnauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const provided = request.headers.get("x-pipeline-secret") ?? "";
  const expected = getPipelineSecret();

  if (!expected || provided !== expected) {
    return buildUnauthorized();
  }

  const llm = buildLlmClient();
  const metrics = await runNewsPipeline({ prisma, llm: llm ?? undefined });
  return NextResponse.json({ llmEnabled: Boolean(llm), metrics });
}
