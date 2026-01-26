export const RSS_FEEDS = [
  {
    id: "reuters-world",
    name: "Reuters World",
    url: "https://feeds.reuters.com/Reuters/worldNews",
    weight: 1.0,
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    weight: 0.95,
  },
  {
    id: "financial-times-world",
    name: "Financial Times World",
    url: "https://www.ft.com/world?format=rss",
    weight: 0.9,
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    weight: 0.9,
  },
  {
    id: "foreign-policy",
    name: "Foreign Policy",
    url: "https://foreignpolicy.com/feed/",
    weight: 0.85,
  },
  {
    id: "council-on-foreign-relations",
    name: "Council on Foreign Relations",
    url: "https://www.cfr.org/rss/global",
    weight: 0.85,
  },
  {
    id: "the-guardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    weight: 0.8,
  },
  {
    id: "the-geopolitics",
    name: "The Geopolitics",
    url: "https://thegeopolitics.com/feed/",
    weight: 0.7,
  },
] as const;
