import { NextResponse } from "next/server";

const getPipelineSecret = (): string => process.env.PIPELINE_SECRET ?? "";

const buildUnauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(request: Request) {
  const provided = request.headers.get("x-pipeline-secret") ?? "";
  const expected = getPipelineSecret();
  console.log("EXPECTED:", process.env.PIPELINE_SECRET);
  console.log("PROVIDED:", provided);

  if (!expected || provided !== expected) {
    return buildUnauthorized();
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
