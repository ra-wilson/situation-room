import type { PublicSearchResponse } from "./types";

const PUBLIC_SEARCH_URL = "https://gamma-api.polymarket.com/public-search";

type PublicSearchParams = {
  q: string;
  page: number;
  limitPerType: number;
  eventsStatus?: "active" | "closed";
};

export const fetchPublicSearch = async (
  params: PublicSearchParams
): Promise<PublicSearchResponse> => {
  const searchParams = new URLSearchParams({
    q: params.q,
    page: String(params.page),
    limit_per_type: String(params.limitPerType),
  });

  if (params.eventsStatus) {
    searchParams.set("events_status", params.eventsStatus);
  }

  const res = await fetch(`${PUBLIC_SEARCH_URL}?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Public search failed with status ${res.status}`);
  }
  return (await res.json()) as PublicSearchResponse;
};
