/**
 * Wardrobe Analysis Service
 *
 * Analyzes a user's wardrobe and generates AI-powered recommendations
 * with actual shoppable product links from Google Shopping.
 */

const { model, withRetry } = require("../config/gemini");

/**
 * Search Google Shopping via SerpAPI.
 */
async function shoppingSearch(query, budget) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return [];

  // Map budget level to price sorting/filtering hint
  const budgetSuffix =
    budget === "low"
      ? " under 1000"
      : budget === "luxury"
        ? " premium designer"
        : "";

  const params = new URLSearchParams({
    q: query + budgetSuffix,
    engine: "google_shopping",
    api_key: apiKey,
    gl: "in",
    hl: "en",
    num: 4,
  });

  try {
    const resp = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.shopping_results || []).slice(0, 4).map((item) => ({
      title: item.title,
      price: item.price,
      extractedPrice: item.extracted_price,
      source: item.source,
      productLink: item.product_link,
      thumbnail: item.thumbnail,
      delivery: item.delivery,
      rating: item.rating,
      reviews: item.reviews,
    }));
  } catch {
    return [];
  }
}

/**
 * Analyze the wardrobe and return recommendations with real product links.
 *
 * @param {Array} items - All clothing items from the user's wardrobe
 * @param {Object} user - The user document (for preferences/budget)
 * @returns {Object} - { summary, strengths, gaps, recommendations[] with products }
 */
async function analyzeWardrobe(items, user = {}) {
  if (!items.length) {
    return {
      summary: { totalItems: 0 },
      strengths: [],
      gaps: ["Your wardrobe is empty!"],
      recommendations: [],
    };
  }

  const summary = buildAnalysisSummary(items);
  const prefs = user.aiMemory || {};
  const budget = prefs.budget || "mid";

  const prefsBlock = [
    prefs.favoriteColors?.length
      ? `Favorite colors: ${prefs.favoriteColors.join(", ")}`
      : null,
    prefs.favoriteStyles?.length
      ? `Favorite styles: ${prefs.favoriteStyles.join(", ")}`
      : null,
    prefs.favoriteBrands?.length
      ? `Preferred brands: ${prefs.favoriteBrands.join(", ")}`
      : null,
    prefs.bodyType ? `Body type: ${prefs.bodyType}` : null,
    `Budget level: ${budget}`,
    prefs.notes?.length ? `Notes: ${prefs.notes.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a professional fashion consultant analyzing a person's wardrobe.

WARDROBE DATA:
${JSON.stringify(summary, null, 2)}

USER PREFERENCES:
${prefsBlock}

Based on this wardrobe and user preferences, provide exactly 5-7 specific recommendations for items to add.

Return a JSON object with this EXACT structure:
{
  "strengths": ["2-3 strings about what's good about this wardrobe"],
  "gaps": ["2-3 strings about what's missing or weak"],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "reason": "why this would improve the wardrobe",
      "searchQuery": "a Google Shopping search query to find this exact item (be specific with color, type, gender, fit)"
    }
  ]
}

GUIDELINES:
- The searchQuery MUST be specific enough for Google Shopping — include gender, color, item type, and fit
  Good: "men navy blue slim fit chinos"
  Bad: "versatile men's trousers chinos and jeans bundle"
- Consider the user's budget level when suggesting items
- Consider their favorite colors and styles
- Consider color balance — if wardrobe is all dark, suggest lighter pieces
- Consider occasion and season gaps
- High priority = essential gap, Medium = nice to have, Low = style upgrade
- Return ONLY JSON, no markdown`;

  let analysis;
  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    analysis = JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini analysis parse error:", err.message);
    analysis = {
      strengths: ["Unable to analyze at this time"],
      gaps: ["AI analysis temporarily unavailable"],
      recommendations: [],
    };
  }

  // Fetch actual products from Google Shopping for each recommendation
  const recommendations = await Promise.all(
    (analysis.recommendations || []).map(async (rec) => {
      const products = await shoppingSearch(rec.searchQuery, budget);
      return { ...rec, products };
    }),
  );

  return {
    summary,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    recommendations,
  };
}

function buildAnalysisSummary(items) {
  const byCategory = {};
  const byColor = {};
  const byStyle = {};
  const byOccasion = {};
  const bySeason = {};
  const brands = new Set();

  for (const item of items) {
    // Category counts
    byCategory[item.category] = byCategory[item.category] || [];
    byCategory[item.category].push(item.subCategory || "other");

    // Color distribution
    const color = item.attributes?.color || "unknown";
    byColor[color] = (byColor[color] || 0) + 1;

    // Style spread
    if (item.style) {
      for (const s of item.style) {
        byStyle[s] = (byStyle[s] || 0) + 1;
      }
    }

    // Occasion coverage
    if (item.occasion) {
      for (const o of item.occasion) {
        byOccasion[o] = (byOccasion[o] || 0) + 1;
      }
    }

    // Season coverage
    if (item.season) {
      for (const s of item.season) {
        bySeason[s] = (bySeason[s] || 0) + 1;
      }
    }

    if (item.brand) brands.add(item.brand);
  }

  return {
    totalItems: items.length,
    categories: Object.fromEntries(
      Object.entries(byCategory).map(([cat, subs]) => [
        cat,
        {
          count: subs.length,
          types: [...new Set(subs)],
        },
      ]),
    ),
    colorDistribution: byColor,
    styleDistribution: byStyle,
    occasionCoverage: byOccasion,
    seasonCoverage: bySeason,
    brands: [...brands],
  };
}

module.exports = { analyzeWardrobe };
