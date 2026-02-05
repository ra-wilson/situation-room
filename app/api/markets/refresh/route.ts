import { NextResponse } from "next/server";

import { getQuote } from "@/src/lib/finnhub";
import { prisma } from "@/src/lib/db";
import { buildCronUnauthorized, isCronAuthorized } from "@/src/lib/cron-auth";
import { runWithCronGuard } from "@/src/lib/cron-guard";

export const dynamic = "force-dynamic";

type MarketSource = {
  id: string;
  label: string;
  displaySymbol: string;
  symbol: string;
  format: "currency" | "fx4" | "fx2";
};

const MARKET_SOURCES: MarketSource[] = [
  { id: "eurusd", label: "EUR/USD", displaySymbol: "EUR", symbol: "OANDA:EUR_USD", format: "fx4" },
  { id: "gbpusd", label: "GBP/USD", displaySymbol: "GBP", symbol: "OANDA:GBP_USD", format: "fx4" },
  { id: "usdjpy", label: "USD/JPY", displaySymbol: "JPY", symbol: "OANDA:USD_JPY", format: "fx2" },
  { id: "usdcnh", label: "USD/CNH", displaySymbol: "CNH", symbol: "OANDA:USD_CNH", format: "fx4" },
  { id: "xauusd", label: "Gold", displaySymbol: "XAU", symbol: "OANDA:XAU_USD", format: "currency" },
  { id: "wti", label: "WTI Crude", displaySymbol: "WTI", symbol: "OANDA:WTICO_USD", format: "currency" },
  { id: "brent", label: "Brent Crude", displaySymbol: "BRENT", symbol: "OANDA:BCO_USD", format: "currency" },
  { id: "spy", label: "SPY", displaySymbol: "SPY", symbol: "SPY", format: "currency" },
  { id: "qqq", label: "QQQ", displaySymbol: "QQQ", symbol: "QQQ", format: "currency" },
  { id: "tlt", label: "TLT", displaySymbol: "TLT", symbol: "TLT", format: "currency" },
  { id: "vixy", label: "VIXY", displaySymbol: "VIXY", symbol: "VIXY", format: "currency" },
  { id: "dia", label: "DIA", displaySymbol: "DIA", symbol: "DIA", format: "currency" },
];

const isValidPrice = (price: number | null) =>
  typeof price === "number" && Number.isFinite(price) && price > 0;

const formatValue = (price: number, format: MarketSource["format"]) => {
  switch (format) {
    case "fx2":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    case "fx4":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(price);
    default:
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
  }
};

const toPercentChange = (current: number, open: number) =>
  ((current - open) / open) * 100;

const MARKET_GUARD_KEY = "markets-refresh";
const MARKET_GUARD_TTL_MS = 2 * 60 * 1000;

export async function POST(request: Request) {
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: "Missing FINNHUB_API_KEY" },
      { status: 500 },
    );
  }

  if (!isCronAuthorized(request)) {
    return buildCronUnauthorized();
  }

  const guarded = await runWithCronGuard(MARKET_GUARD_KEY, MARKET_GUARD_TTL_MS, async () => {
    const data = await Promise.all(
      MARKET_SOURCES.map(async (item) => {
        try {
          const quote = await getQuote(item.symbol);
          const price = quote?.c ?? null;
          const open = quote?.o ?? null;
          const ok = isValidPrice(price);
          const change =
            ok && isValidPrice(open)
              ? toPercentChange(price as number, open as number)
              : 0;
          return {
            symbol: item.displaySymbol,
            name: item.label,
            value: ok ? formatValue(price as number, item.format) : "—",
            change,
            ok,
          };
        } catch {
          return {
            symbol: item.displaySymbol,
            name: item.label,
            value: "—",
            change: 0,
            ok: false,
          };
        }
      }),
    );

    const snapshot = {
      updatedAt: new Date().toISOString(),
      data,
    };

    await prisma.marketSnapshot.create({
      data: { payload: snapshot },
    });

    return snapshot;
  });

  if (guarded.skipped) {
    return NextResponse.json(
      { error: "Refresh already running" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, updatedAt: guarded.result.updatedAt });
}
