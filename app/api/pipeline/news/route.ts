import { NextResponse } from "next/server";
import { runNewsPipeline } from "../../../../../src/features/news/pipeline/runNewsPipeline";
import { prisma } from "@/src/lib/db";

const getPipelineSecret = (): string => process.env.PIPELINE_SECRET ?? "";

const buildUnauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(request: Request) {
  const provided = request.headers.get("x-pipeline-secret") ?? "";
  const expected = getPipelineSecret();

  if (!expected || provided !== expected) {
    return buildUnauthorized();
  }

  const metrics = await runNewsPipeline({ prisma });
  return NextResponse.json(metrics);
}
