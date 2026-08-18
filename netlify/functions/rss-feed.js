// CEI RSS Function v4.4
// Real RSS/XML fetch plus article-aware Cedarbrook intelligence.
// Adds executiveTakeaway and stronger prediction logic.
// No npm dependencies required.
// Endpoint: /.netlify/functions/rss-feed

const SOURCES = [
  {
    name: "Bank of Canada",
    category: "Rates",
    tier: "Tier 1",
    relevance: 5,
    feedUrl: "https://www.bankofcanada.ca/feed/",
    fallbackUrl: "https://www.bankofcanada.ca/rss-feeds/"
  },
  {
    name: "CMHC",
    category: "Housing",
    tier: "Tier 1",
    relevance: 5,
    feedUrl: "https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss",
    fallbackUrl: "https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss"
  }
];

const TERMS = {
  local: [
    "chilliwack",
    "fraser valley",
    "abbotsford",
    "mission",
    "langley",
    "hope",
    "lower mainland",
    "british columbia",
    "b.c.",
    "bc"
  ],
  cedarbrook: [
    "land",
    "development",
    "subdivision",
    "servicing",
    "infrastructure",
    "retail",
    "commercial",
    "industrial",
    "multifamily",
    "multi-family",
    "rental",
    "housing",
    "starts",
    "absorption",
    "population",
    "affordability",
    "mortgage",
    "interest rate",
    "rate",
    "inflation",
    "construction",
    "supply",
    "employment",
    "municipal",
    "approval",
    "permit",
    "zoning",
    "transportation",
    "townhome",
    "apartment",
    "affordable housing",
    "new homes",
    "housing units"
  ],
  rates: [
    "rate",
    "rates",
    "interest",
    "mortgage",
    "monetary",
    "inflation",
    "bond",
    "credit",
    "borrowing",
    "lending"
  ],
  housing: [
    "housing",
    "home",
    "homes",
    "starts",
    "rental",
    "rent",
    "affordability",
    "supply",
    "inventory",
    "apartment",
    "multifamily",
    "multi-family",
    "townhome",
    "affordable housing",
    "new homes",
    "housing units"
  ],
  construction: [
    "construction",
    "building",
    "materials",
    "labour",
    "labor",
    "supply chain",
    "cost",
    "costs",
    "permit",
    "permits"
  ],
  retail: [
    "retail",
    "consumer",
    "spending",
    "business",
    "commercial",
    "store",
    "restaurant",
    "employment",
    "population"
  ],
  approvals: [
    "municipal",
    "approval",
    "approvals",
    "zoning",
    "permit",
    "permits",
    "infrastructure",
    "servicing",
    "transportation",
    "water",
    "sewer",
    "road"
  ]
};

function decodeEntities(text = "") {
  return String(text)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
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

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function textOf(article) {
  return `${article.source || ""} ${article.category || ""} ${article.title || ""} ${article.summary || ""}`.toLowerCase();
}

function titleSummaryOf(article) {
  return `${article.title || ""} ${article.summary || ""}`.toLowerCase();
}

function has(text, list) {
  return list.some(term => text.includes(term));
}

function count(text, list) {
  return list.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0);
}

function inferCategory(article) {
  const text = textOf(article);
  const scores = {
    Rates: count(text, TERMS.rates),
    Housing: count(text, TERMS.housing),
    Construction: count(text, TERMS.construction),
    Retail: count(text, TERMS.retail),
    Municipal: count(text, TERMS.approvals)
  };

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : article.category || "General";
}

function inferSignalType(article) {
  const text = titleSummaryOf(article);

  if (has(text, ["housing starts", "construction data", "housing completions", "starts and construction"])) return "SUPPLY_SIGNAL";
  if (has(text, ["housing design catalogue", "design catalogue", "standardized housing", "standardized designs", "local partner"])) return "PRODUCT_PLANNING_SIGNAL";
  if (has(text, ["purpose-built rental", "rental", "rent growth", "rents", "vacancy", "rental homes", "rental housing"])) return "RENTAL_SIGNAL";
  if (has(text, ["affordable housing", "affordable homes", "new affordable homes", "housing units", "new homes", "housing project", "housing development", "transitional housing", "seniors housing"])) return "GOVERNMENT_FUNDING_SIGNAL";
  if (has(text, ["funding", "investment", "federal government supports", "government announces funding", "announces funding", "supports the construction", "support construction"])) return "GOVERNMENT_FUNDING_SIGNAL";
  if (has(text, ["retrofit", "retrofits", "energy efficiency", "deep retrofit", "renewal", "repair", "repairs"])) return "HOUSING_RENEWAL_SIGNAL";
  if (has(text, ["affordability", "home prices", "ownership costs", "down payment", "income required"])) return "AFFORDABILITY_SIGNAL";
  if (has(text, ["population", "migration", "immigration", "household growth", "demographic"])) return "POPULATION_SIGNAL";
  if (has(text, ["retail", "consumer spending", "commercial", "store", "restaurant", "business opening"])) return "RETAIL_SIGNAL";
  if (has(text, ["employment", "jobs", "labour market", "labor market", "wages", "unemployment"])) return "EMPLOYMENT_SIGNAL";
  if (has(text, ["interest rate", "rate announcement", "rate decision", "bank of canada", "mortgage", "monetary policy", "inflation", "summary of deliberations", "market participants survey", "business outlook survey"])) return "RATE_SIGNAL";
  if (has(text, ["construction cost", "building costs", "materials", "labour shortage", "labor shortage", "supply chain"])) return "COST_SIGNAL";
  if (has(text, ["permit", "approval", "zoning", "municipal", "development application", "entitlement"])) return "APPROVAL_SIGNAL";
  if (has(text, ["infrastructure", "transportation", "water", "sewer", "road", "servicing", "transit"])) return "SERVICING_SIGNAL";

  return "GENERAL_SIGNAL";
}

function isChilliwackRelevant(article) {
  const text = textOf(article);
  return has(text, TERMS.local) || has(text, TERMS.cedarbrook);
}

function isFraserValleyRelevant(article) {
  return has(textOf(article), [
    "fraser valley",
    "chilliwack",
    "abbotsford",
    "mission",
    "hope",
    "langley",
    "lower mainland",
    "british columbia",
    "b.c.",
    "bc"
  ]);
}

function relevanceLevel(score) {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  if (score >= 40) return "Watch";
  return "Low";
}

function starsFromScore(score) {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

function scoreArticle(article) {
  const text = textOf(article);
  const signalType = inferSignalType(article);
  let score = 30;

  if (article.tier === "Tier 1") score += 10;
  if (has(text, TERMS.local)) score += 25;
  if (has(text, TERMS.cedarbrook)) score += 20;
  if (has(text, TERMS.rates)) score += 12;
  if (has(text, TERMS.housing)) score += 12;
  if (has(text, TERMS.construction)) score += 9;
  if (has(text, TERMS.retail)) score += 8;
  if (has(text, TERMS.approvals)) score += 8;

  if (signalType !== "GENERAL_SIGNAL") score += 8;
  if (signalType === "SUPPLY_SIGNAL") score += 8;
  if (signalType === "RATE_SIGNAL") score += 8;
  if (signalType === "GOVERNMENT_FUNDING_SIGNAL") score += 8;
  if (signalType === "APPROVAL_SIGNAL") score += 7;
  if (signalType === "SERVICING_SIGNAL") score += 7;
  if (signalType === "RENTAL_SIGNAL") score += 6;

  const title = (article.title || "").toLowerCase();
  if (has(title, TERMS.local)) score += 10;
  if (has(title, TERMS.cedarbrook)) score += 10;

  return Math.max(0, Math.min(100, score));
}

function inferImpact(article) {
  const text = textOf(article);

  if (has(text, ["decline", "declines", "fall", "falls", "drop", "drops", "slow", "slows", "weak", "recession", "higher rates"])) {
    return "Bearish";
  }

  if (has(text, ["grow", "growth", "increase", "increases", "rise", "rises", "lower rates", "rate cut", "cuts", "improve", "improves", "strong", "demand", "funding", "investment"])) {
    return "Bullish";
  }

  return "Neutral";
}

function inferWhy(article) {
  const signalType = inferSignalType(article);

  switch (signalType) {
    case "SUPPLY_SIGNAL":
      return "Housing starts and construction activity may indicate future supply pressure. Monitor Fraser Valley competitive inventory and potential impacts on Cedarbrook absorption, release timing, and pricing power.";

    case "PRODUCT_PLANNING_SIGNAL":
      return "Standardized housing designs or catalogue-based delivery may reduce design complexity, approval friction, and delivery timelines. This may be relevant for future Cedarbrook product planning, repeatable housing forms, and municipal conversations.";

    case "RENTAL_SIGNAL":
      return "Rental market activity may influence future multifamily demand, tenure mix, investor appetite, and long-term rental strategy opportunities within Cedarbrook.";

    case "GOVERNMENT_FUNDING_SIGNAL":
      return "Government housing investment may accelerate future housing supply and influence competitive inventory levels. Monitor implications for long-term Cedarbrook absorption, affordability policy, and regional housing delivery momentum.";

    case "HOUSING_RENEWAL_SIGNAL":
      return "Housing retrofit or renewal investment may extend the life of existing housing stock and reduce near-term replacement demand. Monitor long-term implications for new housing absorption and affordability conditions.";

    case "AFFORDABILITY_SIGNAL":
      return "Affordability changes may affect buyer qualification, achievable pricing, product mix, release timing, and residential absorption rates at Cedarbrook.";

    case "POPULATION_SIGNAL":
      return "Population growth may strengthen long-term housing demand, retail support, school demand, traffic assumptions, and future phase absorption within Cedarbrook.";

    case "RETAIL_SIGNAL":
      return "Retail and consumer trends may influence tenant demand, commercial lease-up assumptions, daily-needs retail support, and future service offerings within Cedarbrook Village Centre.";

    case "EMPLOYMENT_SIGNAL":
      return "Employment growth may improve household formation, purchasing power, and housing demand within Chilliwack and the Fraser Valley. Weakening employment would increase absorption and affordability risk.";

    case "RATE_SIGNAL":
      return "Interest rate and credit conditions may directly affect buyer qualification, borrowing costs, residential absorption, land valuations, and development underwriting assumptions.";

    case "COST_SIGNAL":
      return "Construction cost pressures may affect project margins, contingency requirements, servicing budgets, tender strategy, and development phasing decisions.";

    case "APPROVAL_SIGNAL":
      return "Approval and permitting trends may affect entitlement risk, development timelines, consultant coordination, and project delivery certainty for Cedarbrook and similar Chilliwack projects.";

    case "SERVICING_SIGNAL":
      return "Infrastructure or servicing investment may affect development capacity, transportation access, utility planning, municipal coordination, and long-term growth opportunities around Cedarbrook.";

    default:
      return "Monitor this signal for potential impacts on Cedarbrook land development, absorption, municipal planning, retail demand, servicing assumptions, or long-term growth strategy.";
  }
}

function executiveTakeaway(article) {
  const signalType = inferSignalType(article);

  switch (signalType) {
    case "SUPPLY_SIGNAL":
      return "Housing supply is expanding. Watch whether new inventory creates competitive pressure or confirms strong underlying demand.";

    case "PRODUCT_PLANNING_SIGNAL":
      return "Standardized housing delivery is becoming a practical policy and product strategy. Repeatable designs could become a speed-to-market advantage.";

    case "RENTAL_SIGNAL":
      return "Rental housing remains a priority segment. Persistent affordability pressure may keep rental demand resilient.";

    case "GOVERNMENT_FUNDING_SIGNAL":
      return "Public-sector housing investment remains active. Government funding may accelerate supply creation and shape local expectations around affordability and delivery timelines.";

    case "HOUSING_RENEWAL_SIGNAL":
      return "Existing housing renewal may relieve some pressure on new supply, but it can also signal ongoing affordability and inventory constraints.";

    case "AFFORDABILITY_SIGNAL":
      return "Affordability remains a key constraint on housing demand, price bands, and residential product positioning.";

    case "POPULATION_SIGNAL":
      return "Population growth remains one of the strongest long-term drivers of housing demand, retail support, and land value.";

    case "RETAIL_SIGNAL":
      return "Consumer and retail activity are useful leading indicators for commercial absorption and mixed-use demand.";

    case "EMPLOYMENT_SIGNAL":
      return "Labour market strength supports household formation, purchasing power, and housing absorption.";

    case "RATE_SIGNAL":
      return "Financing conditions remain the most important short-term driver of residential demand, land values, and underwriting confidence.";

    case "COST_SIGNAL":
      return "Construction cost pressure remains a direct threat to feasibility, margins, and delivery timing.";

    case "APPROVAL_SIGNAL":
      return "Approvals remain one of the highest-impact controllable risks in land development.";

    case "SERVICING_SIGNAL":
      return "Infrastructure capacity often determines the practical pace and location of future community growth.";

    default:
      return "Monitor for strategic implications affecting housing demand, land values, approvals, servicing, retail demand, or growth.";
  }
}

function predictionHint(article) {
  const signalType = inferSignalType(article);

  switch (signalType) {
    case "SUPPLY_SIGNAL":
      return "If housing starts continue rising, competitive inventory may increase and Cedarbrook absorption assumptions should be reviewed against future supply conditions.";

    case "PRODUCT_PLANNING_SIGNAL":
      return "If standardized housing design gains traction, Cedarbrook may have an opportunity to reduce design cycle time and improve repeatable product delivery.";

    case "RENTAL_SIGNAL":
      return "If rental demand remains resilient, Cedarbrook multifamily or mixed-tenure planning may become more attractive over the next planning cycle.";

    case "GOVERNMENT_FUNDING_SIGNAL":
      return "If public funding continues flowing into housing supply, competitive inventory may increase over time and local governments may expect faster delivery from private projects.";

    case "HOUSING_RENEWAL_SIGNAL":
      return "If renewal funding expands, some existing housing may remain viable longer, which could slightly reduce replacement-driven demand for new supply.";

    case "AFFORDABILITY_SIGNAL":
      return "If affordability weakens, Cedarbrook may need tighter attention on product mix, price bands, and buyer qualification assumptions.";

    case "POPULATION_SIGNAL":
      return "If population growth remains strong, Cedarbrook housing demand, retail support, and phase absorption may improve over the next 12 to 24 months.";

    case "RETAIL_SIGNAL":
      return "If consumer and local retail demand improve, Cedarbrook Village Centre tenant conversations may strengthen.";

    case "EMPLOYMENT_SIGNAL":
      return "If employment conditions improve, household formation and buyer confidence may support stronger Cedarbrook absorption.";

    case "RATE_SIGNAL":
      return "If rate conditions ease or buyer confidence improves, Cedarbrook absorption and financing assumptions may strengthen over the next two quarters.";

    case "COST_SIGNAL":
      return "If construction cost pressure increases, Cedarbrook contingency planning and delivery schedules may need closer monitoring.";

    case "APPROVAL_SIGNAL":
      return "If approval or permitting constraints tighten, Cedarbrook schedule risk may increase and should be reviewed against current phasing assumptions.";

    case "SERVICING_SIGNAL":
      return "If infrastructure capacity improves, Cedarbrook development timing and surrounding land value assumptions may strengthen.";

    default:
      return "Track whether this signal becomes confirmed by follow-up data before using it to adjust Cedarbrook assumptions.";
  }
}

function enrichArticle(article) {
  const category = inferCategory(article);
  const enrichedBase = { ...article, category };
  const signalType = inferSignalType(enrichedBase);
  const relevanceScore = scoreArticle(enrichedBase);
  const cedarbrookImpact = inferWhy(enrichedBase);
  const takeaway = executiveTakeaway(enrichedBase);
  const prediction = predictionHint(enrichedBase);

  return {
    ...enrichedBase,
    signalType,
    relevanceScore,
    relevanceLevel: relevanceLevel(relevanceScore),
    relevance: starsFromScore(relevanceScore),
    highRelevance: relevanceScore >= 80,
    chilliwackRelevant: isChilliwackRelevant(enrichedBase),
    fraserValleyRelevant: isFraserValleyRelevant(enrichedBase),
    impact: article.impact && article.impact !== "Unclassified" ? article.impact : inferImpact(enrichedBase),
    cedarbrookImpact,
    why: cedarbrookImpact,
    executiveTakeaway: takeaway,
    predictionHint: prediction,
    predictionText: prediction
  };
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  return blocks
    .slice(0, 12)
    .map(block => {
      const isAtom = /^<entry/i.test(block.trim());
      const title = getTag(block, "title");
      if (!title) return null;

      const link = isAtom ? getAtomLink(block) || getTag(block, "link") : getTag(block, "link");
      const publishedRaw = getTag(block, "pubDate") || getTag(block, "published") || getTag(block, "updated");
      const summary = getTag(block, "description") || getTag(block, "summary") || getTag(block, "content:encoded");

      return enrichArticle({
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
        summary,
        feedUrl: source.feedUrl
      });
    })
    .filter(Boolean);
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CEI-News-Aggregator/4.4 (+Netlify Function)",
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

    if (!/<rss|<feed|<item|<entry/i.test(text)) {
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

exports.handler = async event => {
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

  const sources = results.map(({ source, ok, status, error, count }) => ({
    source,
    ok,
    status,
    error,
    count: count || 0
  }));

  const byId = new Map();
  results.forEach(result => {
    result.articles.forEach(article => {
      if (!byId.has(article.id)) byId.set(article.id, article);
    });
  });

  const articles = Array.from(byId.values())
    .sort((a, b) => {
      const da = a.published ? new Date(a.published).getTime() : 0;
      const db = b.published ? new Date(b.published).getTime() : 0;
      return db - da;
    })
    .slice(0, 30);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      generatedAt: new Date().toISOString(),
      sources,
      articles
    })
  };
};
