import type { Event } from "./types";
import { fetchPublicSearch } from "./publicSearch";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FetchAllEventsOptions = {
  maxPages?: number;
  limitPerType?: number;
  eventsStatus?: "active" | "closed";
};

export const fetchAllEventsForQuery = async (
  q: string,
  options: FetchAllEventsOptions = {}
): Promise<Event[]> => {
  const maxPages = options.maxPages ?? 3;
  const limitPerType = options.limitPerType ?? 10;
  const eventsStatus = options.eventsStatus;

  const allEvents: Event[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    // eslint-disable-next-line no-console
    console.log(`[polymarket] fetchPublicSearch page ${page}`);
    const response = await fetchPublicSearch({
      q,
      page,
      limitPerType,
      eventsStatus,
    });

    if (response.events?.length) {
      allEvents.push(...response.events);
    }

    const pagination = (response as { pagination?: { hasMore?: boolean } }).pagination;
    hasMore = Boolean(pagination?.hasMore);
    page += 1;

    if (hasMore && page <= maxPages) {
      await sleep(150);
    }
  }

  return allEvents;
};
