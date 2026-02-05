import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
  prismaLogOnce?: boolean;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

const getDatabaseHost = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) return "DATABASE_URL not set";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || "unknown-host";
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${host}${port}`;
  } catch {
    return "DATABASE_URL invalid";
  }
};

const withPoolerSettings = (rawUrl: string | undefined): string | undefined => {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const port = parsed.port;
    const isPoolerHost = host.includes("pooler") || port === "6543";
    if (!isPoolerHost) return rawUrl;

    const params = parsed.searchParams;
    if (!params.has("pgbouncer")) {
      params.set("pgbouncer", "true");
    }
    if (!params.has("statement_cache_size")) {
      params.set("statement_cache_size", "0");
    }
    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

if (!globalForPrisma.prismaLogOnce) {
  globalForPrisma.prismaLogOnce = true;
  console.info(`[prisma] Using database host: ${getDatabaseHost()}`);
}

const prismaUrl = withPoolerSettings(process.env.DATABASE_URL);
if (prismaUrl && prismaUrl !== process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.info("[prisma] Applied pooler-safe settings to DATABASE_URL");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: prismaUrl ? { db: { url: prismaUrl } } : undefined,
  });
globalForPrisma.prisma = prisma;
