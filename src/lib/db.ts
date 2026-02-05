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

if (!globalForPrisma.prismaLogOnce) {
  globalForPrisma.prismaLogOnce = true;
  console.info(`[prisma] Using database host: ${getDatabaseHost()}`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;
