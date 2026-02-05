import { promises as fs } from "fs";
import path from "path";

export type MarketSnapshotItem = {
  symbol: string;
  name: string;
  value: string;
  change: number;
  ok?: boolean;
};

export type MarketSnapshot = {
  updatedAt: string;
  data: MarketSnapshotItem[];
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "markets.json");

export const readMarketSnapshot = async (): Promise<MarketSnapshot | null> => {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as MarketSnapshot;
    if (!parsed || !Array.isArray(parsed.data)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeMarketSnapshot = async (
  snapshot: MarketSnapshot,
): Promise<void> => {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
};
