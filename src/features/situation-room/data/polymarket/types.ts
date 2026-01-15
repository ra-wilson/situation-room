export type Tag = {
  id: string;
  label: string;
  slug?: string;
};

export type Market = {
  id: string;
  slug?: string;
  question?: string;
  endDate?: string;
  category?: string;
  outcomes?: string | string[];
  outcomePrices?: string | Array<string | number>;
  oneHourPriceChange?: number | null;
  oneDayPriceChange?: number | null;
};

export type Event = {
  id: string;
  slug?: string;
  title?: string;
  category?: string;
  markets?: Market[];
  tags?: Tag[];
};

export type PublicSearchResponse = {
  events?: Event[];
  tags?: Tag[];
};
