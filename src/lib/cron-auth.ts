import { NextResponse } from "next/server";

type CronAuthOptions = {
  allowPipelineSecret?: boolean;
};

export const isCronAuthorized = (request: Request, options?: CronAuthOptions): boolean => {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const cronProvided = request.headers.get("x-cron-secret") ?? "";

  if (cronSecret && cronProvided === cronSecret) {
    return true;
  }

  if (options?.allowPipelineSecret) {
    const pipelineSecret = process.env.PIPELINE_SECRET ?? "";
    const pipelineProvided = request.headers.get("x-pipeline-secret") ?? "";
    if (pipelineSecret && pipelineProvided === pipelineSecret) {
      return true;
    }
  }

  return false;
};

export const buildCronUnauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
