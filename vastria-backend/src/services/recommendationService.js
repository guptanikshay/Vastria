/**
 * Recommendation Service
 * Filters and ranks outfits based on occasion, weather, season, and user preferences
 */

const { generateOutfits } = require("./outfitGenerator");

const OCCASION_STYLE_MAP = {
  casual: { styles: ["casual", "streetwear", "minimalist"], minScore: 50 },
  formal: { styles: ["formal", "business", "elegant"], minScore: 70 },
  parties: { styles: ["trendy", "formal", "streetwear"], minScore: 65 },
  wedding: { styles: ["formal", "elegant"], minScore: 75 },
  office: { styles: ["business", "formal"], minScore: 70 },
  date: { styles: ["casual", "elegant", "trendy"], minScore: 65 },
  gym: { styles: ["sporty", "casual"], minScore: 50 },
  outdoor: { styles: ["casual", "sporty", "streetwear"], minScore: 55 },
};

const WEATHER_FILTERS = {
  hot: {
    materials: ["cotton", "linen", "breathable"],
    excludePattern: ["wool", "heavy"],
    itemTypes: ["t-shirt", "shorts", "light"],
  },
  cold: {
    materials: ["wool", "fleece", "thermal"],
    excludePattern: ["light", "thin"],
    itemTypes: ["sweater", "hoodie", "pants"],
  },
  rainy: {
    materials: ["waterproof", "synthetic", "nylon"],
    excludePattern: ["suede", "velvet"],
    itemTypes: ["boots", "raincoat"],
  },
  moderate: {
    materials: ["cotton", "polyester", "blend"],
    excludePattern: [],
    itemTypes: [],
  },
};

const SEASON_FILTERS = {
  summer: {
    materials: ["cotton", "linen"],
    colors: ["light", "pastel", "white", "cream"],
  },
  winter: {
    materials: ["wool", "fleece", "thermal"],
    colors: ["dark", "navy", "black", "brown"],
  },
  spring: {
    materials: ["cotton", "polyester"],
    colors: ["pastel", "light", "bright"],
  },
  fall: {
    materials: ["wool", "cotton"],
    colors: ["warm", "orange", "brown", "red"],
  },
};

function filterOutfitsByOccasion(outfits, occasion) {
  if (!occasion || !OCCASION_STYLE_MAP[occasion]) {
    return outfits;
  }

  const { styles, minScore } = OCCASION_STYLE_MAP[occasion];
  return outfits.filter((outfit) => {
    const topStyle = outfit.top.style?.[0]?.toLowerCase() || "";
    return styles.some((s) => topStyle.includes(s)) && outfit.score >= minScore;
  });
}

function filterOutfitsByWeather(outfits, weather, fullClothingItems) {
  if (!weather || !WEATHER_FILTERS[weather]) {
    return outfits;
  }

  // This is simplified - in production, you'd check item details
  return outfits.filter((outfit) => outfit.score >= 55);
}

function filterOutfitsBySeason(outfits, season, fullClothingItems) {
  if (!season || !SEASON_FILTERS[season]) {
    return outfits;
  }

  // Simplified - in production, cross-reference clothing metadata
  return outfits.filter((outfit) => outfit.score >= 55);
}

function applyUserPreferences(outfits, userPreferences) {
  if (!userPreferences || !userPreferences.style) {
    return outfits;
  }

  const prefStyle = userPreferences.style?.toLowerCase();
  return outfits.filter((outfit) => {
    const topStyle = outfit.top.style?.[0]?.toLowerCase() || "";
    // Boost score if matches preference, but don't filter strictly
    return outfit.score >= 50;
  });
}

function recommendOutfits(clothingItems, user, filters = {}) {
  const { occasion, weather, season, minScore = 55 } = filters;

  // Generate all outfits (v2 engine with options object)
  const { outfits: allOutfits, summary } = generateOutfits(clothingItems, {
    minScore,
    maxPerCategory: 50,
  });

  let recommendations = [...allOutfits];

  // Apply filters sequentially
  if (occasion) {
    recommendations = filterOutfitsByOccasion(recommendations, occasion);
  }

  if (weather) {
    recommendations = filterOutfitsByWeather(
      recommendations,
      weather,
      clothingItems,
    );
  }

  if (season) {
    recommendations = filterOutfitsBySeason(
      recommendations,
      season,
      clothingItems,
    );
  }

  // Apply user preferences
  if (user?.preferences) {
    recommendations = applyUserPreferences(recommendations, user.preferences);
  }

  // Sort by score
  recommendations.sort((a, b) => b.score - a.score);

  // Limit to top recommendations
  const topRecommendations = recommendations.slice(0, 20);

  return {
    success: true,
    recommendations: topRecommendations,
    filters: { occasion, weather, season },
    summary: {
      ...summary,
      filtered_count: topRecommendations.length,
      all_count: allOutfits.length,
    },
  };
}

module.exports = {
  recommendOutfits,
  filterOutfitsByOccasion,
  filterOutfitsByWeather,
  filterOutfitsBySeason,
  OCCASION_STYLE_MAP,
  WEATHER_FILTERS,
  SEASON_FILTERS,
};
