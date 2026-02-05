export type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

const getApiKey = (): string | null => {
  const apiKey = process.env.FINNHUB_API_KEY;
  return apiKey && apiKey.trim().length > 0 ? apiKey : null;
};

export const getQuote = async (symbol: string): Promise<FinnhubQuote | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as FinnhubQuote;
  return data;
};
