// CEI RSS Function v4.1
// Real RSS/XML fetch + lightweight parser. No npm dependencies required.
// Endpoint: /.netlify/functions/rss-feed

const SOURCES = [
  {
    name: "Bank of Canada",
    category: "Rates",
    tier: "Tier 1",
    relevance: 5,
    // Bank of Canada is a WordPress site; /feed/ is commonly available.
    // If this source fails, update this URL from the Bank of Canada RSS Feeds page.
    feedUrl: "https://www.bankofcanada.ca/feed/",
    fallbackUrl: "https://www.bankofcanada.ca/rss-feeds/"
  },
  {
    name: "CMHC",
    category: "Housing",
    tier: "Tier 1",
    relevance: 5,
    // CMHC publishes a News Room RSS page. If this URL returns an HTML page instead of RSS XML,
    // the function will surface a source error rather than breaking the whole feed.
    feedUrl: "https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss",
    fallbackUrl: "https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss"
  }
];

function decodeEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function getTag(block, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(regex);
  return match ? decodeEntities(match[1]) : "";
}

function getAtomLink(block) {
  const match = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return match ? match[1].trim() : "";
}

function inferWhy(category, title) {
  const t = `${category} ${title}`.toLowerCase();
  if (t.includes("rate") || t.includes("monetary") || t.includes("inflation")) {
    return "May affect borrowing costs, buyer qualification, absorption assumptions, and land acquisition underwriting.";
  }
  if (t.includes("housing") || t.includes("starts") || t.includes("rental") || t.includes("affordability")) {
    return "May affect housing demand, future inventory, absorption pace, and project feasibility assumptions.";
  }
  if (t.includes("construction") || t.includes("supply")) {
    return "May affect construction cost assumptions, contingency planning, delivery timing, and pro forma risk.";
  }
  return "Potential economic signal to review for Chilliwack land development, housing demand, retail demand, or municipal approval risk.";
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFeed(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of blocks.slice(0, 12)) {
    const isAtom = /^<entry/i.test(block.trim());
    const title = getTag(block, "title");
    const link = isAtom ? (getAtomLink(block) || getTag(block, "link")) : getTag(block, "link");
    const publishedRaw = getTag(block, "pubDate") || getTag(block, "published") || getTag(block, "updated");
    const description = getTag(block, "description") || getTag(block, "summary") || getTag(block, "content:encoded");

    if (!title) continue;

    items.push({
      id: `${source.name}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120),
      title,
      source: source.name,
      category: source.category,
      tier: source.tier,
      relevance: source.relevance,
      impact: "Unclassified",
      link: link || source.fallbackUrl,
      url: link || source.fallbackUrl,
      published: normalizeDate(publishedRaw),
      summary: description,
      why: inferWhy(source.category, title),
      feedUrl: source.feedUrl
    });
  }

  return items;
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CEI-News-Aggregator/4.1 (+Netlify Function)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        source: source.name,
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}`,
        articles: []
      };
    }

    const text = await response.text();
    const looksLikeFeed = /<rss|<feed|<item|<entry/i.test(text);

    if (!looksLikeFeed) {
      return {
        source: source.name,
        ok: false,
        status: response.status,
        error: "Response did not look like RSS/Atom XML. Check feedUrl.",
        articles: []
      };
    }

    const articles = parseFeed(text, source);
    return {
      source: source.name,
      ok: true,
      status: response.status,
      count: articles.length,
      articles
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      source: source.name,
      ok: false,
      status: 0,
      error: error.name === "AbortError" ? "Request timed out" : error.message,
      articles: []
    };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  const results = await Promise.all(SOURCES.map(fetchSource));
  const sourceStatus = results.map(({ source, ok, status, error, count }) => ({ source, ok, status, error, count: count || 0 }));

  const byId = new Map();
  for (const result of results) {
    for (const article of result.articles) {
      if (!byId.has(article.id)) byId.set(article.id, article);
    }
  }

  const articles = Array.from(byId.values()).sort((a, b) => {
    const da = a.published ? new Date(a.published).getTime() : 0;
    const db = b.published ? new Date(b.published).getTime() : 0;
    return db - da;
  }).slice(0, 30);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      generatedAt: new Date().toISOString(),
      sources: sourceStatus,
      articles
    })
  };
};
