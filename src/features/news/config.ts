import { RSS_FEEDS } from "./config/rssFeeds";

export const FEED_URLS = RSS_FEEDS.map((feed) => feed.url);

export const MAX_ARTICLES_PER_FEED = 25;
export const EVENT_LOOKBACK_HOURS = 48;
export const MAX_EVENTS_PER_RUN = 30;
export const MAX_LLM_CALLS_PER_RUN = 5;
export const PIPELINE_RUN_INTERVAL_MINUTES = 60;
