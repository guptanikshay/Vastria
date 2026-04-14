/**
 * Layering Logic for Compound Topwear Outfits
 *
 * Supports combinations like:
 *   T-shirt + Jacket, Shirt + Blazer, Hoodie + Overcoat
 *
 * Rules:
 *   - An outfit can have 1 inner layer + 0-1 outer layer
 *   - Not every topwear can be layered (e.g., 2 jackets = invalid)
 *   - Outer layer must be compatible with inner layer
 */

// ── Layer classification ────────────────────────────────────────────

const INNER_LAYER = new Set([
  "t-shirt",
  "shirt",
  "blouse",
  "top",
  "tank top",
  "polo",
  "henley",
  "turtleneck",
  "camisole",
  "crop top",
  "vest top",
  "sweater", // can be inner under a coat
  "hoodie", // can be inner under a jacket
  // Indian
  "kurta", // can layer under nehru jacket / sherwani
  "kurti",
  "saree blouse",
  "choli",
]);

const OUTER_LAYER = new Set([
  "jacket",
  "blazer",
  "coat",
  "overcoat",
  "bomber",
  "denim jacket",
  "leather jacket",
  "windbreaker",
  "parka",
  "cardigan",
  "puffer",
  "trench coat",
  "hoodie", // can also be outer over a tee
  // Indian
  "nehru jacket", // over kurta
  "bandhgala", // over kurta
  "sherwani", // over kurta (formal)
]);

// Items that can serve as BOTH inner or outer depending on context
const DUAL_LAYER = new Set(["hoodie", "sweater", "cardigan", "shirt"]);

// ── Compatibility rules for layered pairs ───────────────────────────
// key = "inner|outer", value = compatibility score (0-100)
// Higher = better pairing

const LAYER_COMPATIBILITY = {
  "t-shirt|jacket": 92,
  "t-shirt|blazer": 78,
  "t-shirt|bomber": 90,
  "t-shirt|denim jacket": 95,
  "t-shirt|leather jacket": 92,
  "t-shirt|cardigan": 85,
  "t-shirt|hoodie": 88,
  "t-shirt|puffer": 82,
  "t-shirt|windbreaker": 80,
  "t-shirt|overcoat": 75,
  "shirt|blazer": 95,
  "shirt|jacket": 85,
  "shirt|cardigan": 88,
  "shirt|coat": 82,
  "shirt|overcoat": 80,
  "shirt|trench coat": 85,
  "shirt|puffer": 72,
  "blouse|blazer": 90,
  "blouse|cardigan": 88,
  "blouse|jacket": 80,
  "polo|jacket": 82,
  "polo|blazer": 75,
  "henley|jacket": 85,
  "henley|cardigan": 82,
  "turtleneck|blazer": 90,
  "turtleneck|coat": 92,
  "turtleneck|overcoat": 90,
  "turtleneck|jacket": 85,
  "hoodie|jacket": 82,
  "hoodie|puffer": 85,
  "hoodie|overcoat": 78,
  "sweater|coat": 88,
  "sweater|overcoat": 90,
  "sweater|blazer": 80,
  "sweater|jacket": 82,
  "sweater|trench coat": 84,
  "tank top|jacket": 80,
  "tank top|denim jacket": 88,
  "tank top|leather jacket": 85,
  "tank top|cardigan": 78,
  "t-shirt|shirt": 88,
  "tank top|shirt": 80,
  "crop top|jacket": 78,
  "crop top|denim jacket": 85,
  "crop top|blazer": 72,
  // Indian layering
  "kurta|nehru jacket": 95,
  "kurta|bandhgala": 92,
  "kurta|sherwani": 88,
  "kurta|blazer": 78,
  "kurta|jacket": 75,
  "kurti|nehru jacket": 80,
  "kurti|cardigan": 82,
  "kurti|jacket": 72,
};

// ── Public API ──────────────────────────────────────────────────────

/**
 * Classify a clothing item as "inner", "outer", or "dual".
 * Returns null if item is not topwear / not layerable.
 */
function getLayerType(subCategory) {
  const sub = (subCategory || "").toLowerCase().trim();
  if (DUAL_LAYER.has(sub)) return "dual";
  if (INNER_LAYER.has(sub)) return "inner";
  if (OUTER_LAYER.has(sub)) return "outer";
  return null;
}

/**
 * Check if two topwear items can be layered together.
 * Returns { valid: boolean, score: number, inner, outer }
 */
function canLayer(item1, item2) {
  const sub1 = (item1.subCategory || "").toLowerCase().trim();
  const sub2 = (item2.subCategory || "").toLowerCase().trim();

  const type1 = getLayerType(sub1);
  const type2 = getLayerType(sub2);

  if (!type1 || !type2) return { valid: false, score: 0 };

  // Determine which is inner, which is outer
  let inner = null;
  let outer = null;

  if (
    (type1 === "inner" || type1 === "dual") &&
    (type2 === "outer" || type2 === "dual")
  ) {
    // item1 = inner, item2 = outer
    // But both can't be the same role unless one is dual
    if (type1 === type2 && type1 !== "dual") return { valid: false, score: 0 };
    inner = item1;
    outer = item2;
  } else if (
    (type2 === "inner" || type2 === "dual") &&
    (type1 === "outer" || type1 === "dual")
  ) {
    if (type1 === type2 && type1 !== "dual") return { valid: false, score: 0 };
    inner = item2;
    outer = item1;
  } else {
    // Two inners or two outers that aren't dual → invalid
    return { valid: false, score: 0 };
  }

  const innerSub = (inner.subCategory || "").toLowerCase().trim();
  const outerSub = (outer.subCategory || "").toLowerCase().trim();

  // Don't layer identical subCategories (e.g., 2 hoodies)
  if (innerSub === outerSub) return { valid: false, score: 0 };

  // Lookup compatibility score
  const key = `${innerSub}|${outerSub}`;
  const score = LAYER_COMPATIBILITY[key];

  if (score !== undefined) {
    return { valid: true, score, inner, outer };
  }

  // Fallback: valid but lower score for unlisted combos
  return { valid: true, score: 60, inner, outer };
}

/**
 * Given all topwear items, return all valid topwear configurations:
 *   - Each single topwear item (standalone)
 *   - Each valid layered pair (inner + outer)
 *
 * Each config is: { items: [item, ...], layered: boolean, layerScore: number }
 */
function generateTopwearConfigs(topwearItems) {
  const configs = [];

  // Single-item configs
  for (const item of topwearItems) {
    configs.push({
      items: [item],
      layered: false,
      layerScore: 100, // no layering penalty
    });
  }

  // Layered pairs
  for (let i = 0; i < topwearItems.length; i++) {
    for (let j = i + 1; j < topwearItems.length; j++) {
      const result = canLayer(topwearItems[i], topwearItems[j]);
      if (result.valid && result.score >= 60) {
        configs.push({
          items: [result.inner, result.outer],
          layered: true,
          layerScore: result.score,
        });
      }
    }
  }

  return configs;
}

module.exports = {
  getLayerType,
  canLayer,
  generateTopwearConfigs,
  INNER_LAYER,
  OUTER_LAYER,
  DUAL_LAYER,
};
