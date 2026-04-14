/**
 * Outfit Generation Engine v2
 *
 * Generates scored outfit combinations supporting:
 *   - Compound / layered topwear (t-shirt + jacket, shirt + blazer)
 *   - Intelligent accessory variations with conflict resolution
 *   - Multi-factor scoring:
 *       • Color compatibility (curated 100+ pair guide)
 *       • Dominant color count penalty (>3 colors hurts)
 *       • Formal vs casual consistency (formality gap penalty)
 *       • Style affinity
 *       • Footwear-specific rules
 *       • Accessory coordination bonus
 *       • Layering correctness
 *   - Returns top 25 highest-scoring outfits
 */

const {
  getColorScore,
  colorCountPenalty,
  accessoryColorBonus,
  areTooSimilar,
} = require("./colorCompatibility");
const { getStyleScore, formalityPenalty } = require("./styleCompatibility");
const { generateTopwearConfigs } = require("./layeringLogic");
const {
  selectAccessoriesForOutfit,
  getAccessoryType,
} = require("./accessorySystem");

// ── Category mapping ────────────────────────────────────────────────

const CATEGORY_MAPPING = {
  topwear: [
    "shirt",
    "t-shirt",
    "sweater",
    "hoodie",
    "blouse",
    "top",
    "tank top",
    "polo",
    "henley",
    "turtleneck",
    "camisole",
    "crop top",
    "vest top",
    // Outerwear
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
    // Indian topwear
    "kurta",
    "kurti",
    "sherwani",
    "nehru jacket",
    "bandhgala",
    "saree blouse",
    "choli",
  ],
  bottomwear: [
    "jeans",
    "pants",
    "shorts",
    "skirt",
    "leggings",
    "trousers",
    "chinos",
    "joggers",
    "cargo pants",
    "dress pants",
    "culottes",
    // Indian bottomwear
    "churidar",
    "salwar",
    "dhoti",
    "lungi",
    "palazzo",
    "lehenga",
    "pattiala",
  ],
  fullbody: [
    // Full-body garments (treated as top+bottom combined)
    "saree",
    "anarkali",
    "gown",
    "jumpsuit",
    "romper",
    "dress",
  ],
  footwear: [
    "shoes",
    "sneakers",
    "boots",
    "sandals",
    "loafers",
    "oxford",
    "derby",
    "brogues",
    "heels",
    "flats",
    "mules",
    "slip-ons",
    "running shoes",
    "formal shoes",
    // Indian footwear
    "juttis",
    "kolhapuri",
    "mojari",
  ],
  accessories: [
    "watch",
    "belt",
    "necklace",
    "bracelet",
    "scarf",
    "hat",
    "cap",
    "beanie",
    "fedora",
    "beret",
    "bucket hat",
    "sunglasses",
    "glasses",
    "ring",
    "earrings",
    "tie",
    "bow tie",
    "cufflinks",
    "pocket square",
    "bag",
    "backpack",
    "choker",
    "anklet",
    // Socks
    "socks",
    "anklet socks",
    "crew socks",
    "no-show socks",
    "dress socks",
    "athletic socks",
    // Indian accessories
    "dupatta",
    "stole",
    "bindi",
    "maang tikka",
    "jhumka",
    "bangle",
    "payal",
  ],
};

function categorizeItem(item) {
  const category = (item.category || "").toLowerCase().trim();
  const subCategory = (item.subCategory || "").toLowerCase().trim();

  for (const [type, subs] of Object.entries(CATEGORY_MAPPING)) {
    if (category === type || subs.includes(subCategory)) {
      return type;
    }
  }
  return null;
}

// ── Item formality classification ────────────────────────────────────

function getItemFormality(item) {
  const sub = (item.subCategory || "").toLowerCase().trim();
  const styles = (item.style || []).map((s) => s.toLowerCase().trim());
  const name = (item.itemName || "").toLowerCase().trim();
  const material = (item.attributes?.material || "").toLowerCase().trim();

  const hasFormalStyle = styles.some((s) =>
    ["formal", "business", "elegant"].includes(s),
  );
  const hasCasualStyle = styles.some((s) =>
    ["casual", "streetwear", "sporty", "athletic"].includes(s),
  );

  // ── Inherently casual topwear ──
  if (
    [
      "t-shirt",
      "hoodie",
      "polo",
      "henley",
      "tank top",
      "crop top",
      "vest top",
      "camisole",
      "sweater",
      "cardigan",
    ].includes(sub)
  )
    return "casual";

  // ── Shirts ──
  if (sub === "shirt" || sub === "dress shirt") {
    if (name.includes("denim") || material === "denim") return "casual";
    if (sub === "dress shirt") return "formal";
    if (hasFormalStyle) return "formal";
    if (hasCasualStyle) return "casual";
    return "semi-formal";
  }

  // ── Outerwear ──
  if (
    [
      "blazer",
      "coat",
      "overcoat",
      "trench coat",
      "nehru jacket",
      "bandhgala",
      "sherwani",
    ].includes(sub)
  )
    return "formal";
  if (
    [
      "denim jacket",
      "bomber",
      "leather jacket",
      "windbreaker",
      "parka",
      "puffer",
    ].includes(sub)
  )
    return "casual";
  if (sub === "jacket") return hasFormalStyle ? "formal" : "casual";

  // ── Indian topwear ──
  if (["kurta", "kurti", "saree blouse", "choli"].includes(sub)) {
    if (hasFormalStyle) return "formal";
    return "semi-formal";
  }

  // ── Bottomwear ──
  if (["dress pants", "trousers"].includes(sub)) return "formal";
  if (["jeans", "joggers", "cargo pants", "shorts", "leggings"].includes(sub))
    return "casual";
  if (sub === "chinos") return "semi-formal";
  if (sub === "pants") {
    if (hasFormalStyle) return "formal";
    if (hasCasualStyle) return "casual";
    return "semi-formal";
  }
  // Indian bottomwear
  if (
    [
      "churidar",
      "salwar",
      "dhoti",
      "lungi",
      "palazzo",
      "lehenga",
      "pattiala",
    ].includes(sub)
  )
    return "semi-formal";

  // ── Footwear ──
  if (["oxford", "derby", "brogues", "formal shoes", "loafers"].includes(sub))
    return "formal";
  if (["sneakers", "running shoes", "sandals", "slip-ons"].includes(sub))
    return "casual";
  if (sub === "boots") return "versatile";
  if (["juttis", "kolhapuri", "mojari"].includes(sub)) return "casual";

  // ── Fullbody ──
  if (["gown", "anarkali"].includes(sub)) return "formal";
  if (["jumpsuit", "saree"].includes(sub)) return "semi-formal";
  if (sub === "romper") return "casual";
  if (sub === "dress") {
    if (hasFormalStyle) return "formal";
    if (hasCasualStyle) return "casual";
    return "semi-formal";
  }

  // Fallback
  if (hasFormalStyle) return "formal";
  if (hasCasualStyle) return "casual";
  return "casual";
}

// ── Outfit category classification ──────────────────────────────────

function classifyOutfitCategory(effectiveTopFormality, bottomFormality) {
  if (effectiveTopFormality === "formal" && bottomFormality === "formal")
    return "Formal";
  if (effectiveTopFormality === "formal" && bottomFormality === "casual")
    return "Smart Casual";
  if (effectiveTopFormality === "semi-formal" && bottomFormality === "casual")
    return "Smart Casual";
  if (effectiveTopFormality === "casual" && bottomFormality === "casual")
    return "Casual";
  if (effectiveTopFormality === "casual" && bottomFormality === "semi-formal")
    return "Casual";
  return "Semi-Formal";
}

// ── Footwear-specific scoring rules ─────────────────────────────────

// Black shoes are universal — they pair well with ALL pant colors.
// Brown shoes get a bonus with warm/earthy pants to prefer them over black.
// Priority: Shoe=Belt=Watch color match first (handled by mismatch penalties),
//           then shoe-pant color preference (handled here).
const BLACK_SHOE_GOOD_PANTS = new Set([
  "black",
  "grey",
  "gray",
  "charcoal",
  "dark grey",
  "dark gray",
  "light grey",
  "light gray",
  "slate",
  "graphite",
]);

const BROWN_SHOE_GOOD_PANTS = new Set([
  "beige",
  "navy",
  "navy blue",
  "olive",
  "olive green",
  "khaki",
  "tan",
  "cream",
  "camel",
  "sand",
  "taupe",
]);

function footwearBonus(footwear, bottom) {
  const shoeColor = (footwear.attributes?.color || "").toLowerCase().trim();
  const bottomColor = (bottom.attributes?.color || "").toLowerCase().trim();

  if (!shoeColor || !bottomColor) return 0;

  // Brown/tan shoes + warm-toned pants = bonus
  // This makes brown+BROWN_GOOD_PANTS rank above black+BROWN_GOOD_PANTS
  // when both accessory sets match (shoe=belt=watch)
  if (["brown", "tan", "cognac", "camel"].includes(shoeColor)) {
    if (BROWN_SHOE_GOOD_PANTS.has(bottomColor)) return 10;
    return 0; // no penalty — accessory matching handles the rest
  }

  // Black shoes are universal — small boost with dark pants
  if (shoeColor === "black") {
    if (BLACK_SHOE_GOOD_PANTS.has(bottomColor)) return 3;
    return 0; // no penalty with any pants
  }

  return 0;
}

// ── Outfit context builder ──────────────────────────────────────────

const COLLARED_TOPS = new Set(["shirt", "dress shirt"]);
const BLAZER_TYPES = new Set([
  "blazer",
  "suit jacket",
  "nehru jacket",
  "bandhgala",
  "sherwani",
  "tuxedo jacket",
]);

function buildOutfitContext(topConfig, bottom, shoe) {
  const allStyles = [];
  for (const t of topConfig.items) {
    if (Array.isArray(t.style)) allStyles.push(...t.style);
  }
  if (Array.isArray(bottom.style)) allStyles.push(...bottom.style);
  if (Array.isArray(shoe.style)) allStyles.push(...shoe.style);

  const norm = allStyles.map((s) => (s || "").toLowerCase().trim());
  const formalCount = norm.filter((s) =>
    ["formal", "elegant", "business", "semi-formal", "smart casual"].includes(
      s,
    ),
  ).length;
  const casualCount = norm.filter((s) =>
    ["casual", "streetwear", "sporty", "athletic"].includes(s),
  ).length;

  const isFormal = formalCount >= casualCount && formalCount > 0;

  const shoeColor = (shoe.attributes?.color || "").toLowerCase().trim();
  const shoeSubCategory = (shoe.subCategory || "").toLowerCase().trim();

  const outfitColors = [
    ...topConfig.items.map((t) =>
      (t.attributes?.color || "").toLowerCase().trim(),
    ),
    (bottom.attributes?.color || "").toLowerCase().trim(),
    shoeColor,
  ].filter(Boolean);

  const hasCollaredShirt = topConfig.items.some((t) =>
    COLLARED_TOPS.has((t.subCategory || "").toLowerCase().trim()),
  );

  const hasBlazer =
    topConfig.layered &&
    topConfig.items.some((t) =>
      BLAZER_TYPES.has((t.subCategory || "").toLowerCase().trim()),
    );

  return {
    isFormal,
    shoeColor,
    shoeSubCategory,
    outfitColors,
    hasCollaredShirt,
    hasBlazer,
  };
}

// ── Outfit scoring ──────────────────────────────────────────────────

/**
 * Score a complete outfit.
 *
 * @param {Object} topConfig  - { items: [...], layered, layerScore }
 * @param {Object} bottom     - Clothing item
 * @param {Object} footwear   - Clothing item
 * @param {Array}  accessories - Array of clothing items
 * @returns {number} 0-100 score
 */
function scoreOutfit(topConfig, bottom, footwear, accessories = []) {
  const topItems = topConfig.items;
  const primaryTop = topItems[0]; // inner layer or sole top

  // Collect all items for formality check
  const allItems = [...topItems, bottom, footwear, ...accessories];

  // ─ 1. Color compatibility (weighted average of all key pairs) ─────
  let colorTotal = 0;
  let colorPairs = 0;

  // Top(s) ↔ Bottom
  for (const top of topItems) {
    colorTotal += getColorScore(
      top.attributes?.color,
      bottom.attributes?.color,
    );
    colorPairs++;
  }

  // Bottom ↔ Footwear
  colorTotal += getColorScore(
    bottom.attributes?.color,
    footwear.attributes?.color,
  );
  colorPairs++;

  // Top ↔ Footwear
  colorTotal += getColorScore(
    primaryTop.attributes?.color,
    footwear.attributes?.color,
  );
  colorPairs++;

  // If layered: inner ↔ outer color
  if (topConfig.layered && topItems.length === 2) {
    colorTotal += getColorScore(
      topItems[0].attributes?.color,
      topItems[1].attributes?.color,
    );
    colorPairs++;
  }

  const avgColor = colorTotal / colorPairs;

  // ─ 2. Dominant color count penalty ────────────────────────────────
  const dominantColors = [
    ...topItems.map((t) => t.attributes?.color),
    bottom.attributes?.color,
    footwear.attributes?.color,
  ];
  const colorPenalty = colorCountPenalty(dominantColors);

  // ─ 3. Formality consistency penalty ───────────────────────────────
  const fPenalty = formalityPenalty(allItems);

  // ─ 4. Style affinity ─────────────────────────────────────────────
  let styleTotal = 0;
  let stylePairs = 0;

  // Top(s) ↔ Bottom
  for (const top of topItems) {
    styleTotal += getStyleScore(top.style, bottom.style);
    stylePairs++;
  }

  // Top ↔ Footwear
  styleTotal += getStyleScore(primaryTop.style, footwear.style);
  stylePairs++;

  // Bottom ↔ Footwear
  styleTotal += getStyleScore(bottom.style, footwear.style);
  stylePairs++;

  const avgStyle = styleTotal / stylePairs;

  // ─ 5. Footwear bonus / penalty ───────────────────────────────────
  // Black shoes = universal (no penalty). Brown shoes = bonus with warm pants.
  const shoeBonus = footwearBonus(footwear, bottom);

  // ─ 6. Layering score multiplier ──────────────────────────────────
  const layerMultiplier = topConfig.layered ? topConfig.layerScore / 100 : 1.0;

  // ─ 7. Accessory coordination bonus ───────────────────────────────
  const outfitColors = dominantColors;
  const accColors = accessories.map((a) => a.attributes?.color);
  const accBonus = accessoryColorBonus(outfitColors, accColors);

  // ─ Combine into final score ──────────────────────────────────────
  //
  // Weights (sum to 1.0):
  //   Color compatibility:       35%
  //   Style affinity:            23%
  //   Formality consistency:     20%  (multiplier on 100)
  //   Layering correctness:       8%  (multiplier on 100)
  //   Color count penalty:        5%  (multiplier on 100)
  //   Footwear rules:             4%  (additive)
  //   Accessory color bonus:      5%  (scaled from 0-15 to 0-100)
  //
  // Accessories are now rule-selected (belt matches shoes, etc.)
  // so accessory count/style bonuses are no longer needed.

  const accColorNormalized = Math.min(100, (accBonus / 15) * 100);

  let finalScore =
    avgColor * 0.35 +
    avgStyle * 0.23 +
    100 * fPenalty * 0.2 +
    100 * layerMultiplier * 0.08 +
    100 * colorPenalty * 0.05 +
    shoeBonus * 0.8 +
    accColorNormalized * 0.05;

  // Floor and cap
  finalScore = Math.max(0, Math.min(100, finalScore));

  return Math.round(finalScore * 100) / 100;
}

// ── Outfit generation ───────────────────────────────────────────────

// ── Color lightness helpers ──────────────────────────────────────────

const LIGHT_COLORS = new Set([
  "white",
  "cream",
  "ivory",
  "beige",
  "sand",
  "light grey",
  "light gray",
  "light blue",
  "light pink",
  "baby blue",
  "lavender",
  "peach",
  "mint",
  "pastel",
  "sky blue",
  "off-white",
  "lemon",
  "yellow",
  "pink",
  "light green",
  "coral",
  "powder blue",
  "champagne",
  "tan",
  "khaki",
  "camel",
]);

const DARK_COLORS = new Set([
  "black",
  "navy",
  "navy blue",
  "dark grey",
  "dark gray",
  "charcoal",
  "dark blue",
  "dark green",
  "dark brown",
  "maroon",
  "burgundy",
  "wine",
  "dark red",
  "slate",
  "graphite",
  "olive",
  "forest green",
  "espresso",
  "midnight blue",
]);

function isLightColor(color) {
  return LIGHT_COLORS.has((color || "").toLowerCase().trim());
}

function isDarkColor(color) {
  return DARK_COLORS.has((color || "").toLowerCase().trim());
}

// ── Casual layering formality guard ─────────────────────────────────

const CASUAL_OUTER_SUBS = new Set([
  "hoodie",
  "sweater",
  "cardigan",
  "denim jacket",
  "bomber",
  "leather jacket",
  "windbreaker",
  "parka",
  "puffer",
]);

/**
 * Check if a casual outer layer is allowed in a formal/semi-formal outfit.
 * Only allowed if the item is tagged formal/business or has "plain"/"solid"
 * in its name/pattern.
 */
function isCasualOuterAllowedInFormal(outerItem) {
  const styles = (outerItem.style || []).map((s) => s.toLowerCase().trim());
  if (
    styles.some((s) =>
      ["formal", "business", "elegant", "semi-formal"].includes(s),
    )
  )
    return true;

  const name = (outerItem.itemName || "").toLowerCase();
  const pattern = (outerItem.attributes?.pattern || "").toLowerCase();
  if (
    name.includes("plain") ||
    name.includes("solid") ||
    pattern === "solid" ||
    pattern === "plain"
  )
    return true;

  return false;
}

// ── Blazer-pants color matching ─────────────────────────────────────

/**
 * Score a blazer+pants color combination.
 * Returns: { allowed: boolean, bonus: number }
 *
 * Rules:
 *   - Exact match = huge bonus (two-piece suit)
 *   - Light blazer + dark pants = good complement
 *   - Dark blazer + light pants = good complement
 *   - Otherwise = not allowed (skip this combo)
 */
function blazerPantsColorScore(blazerColor, pantsColor) {
  const bc = (blazerColor || "").toLowerCase().trim();
  const pc = (pantsColor || "").toLowerCase().trim();
  if (!bc || !pc) return { allowed: true, bonus: 0 };

  // Exact color match = two-piece suit look → big bonus
  if (bc === pc) return { allowed: true, bonus: 20 };

  // Light blazer + dark pants OR dark blazer + light pants = complement
  if (
    (isLightColor(bc) && isDarkColor(pc)) ||
    (isDarkColor(bc) && isLightColor(pc))
  )
    return { allowed: true, bonus: 5 };

  // Neither match nor complement → don't pair this blazer
  return { allowed: false, bonus: 0 };
}

// ── Shirt priority for blazer outfits ───────────────────────────────

/**
 * Score bonus for shirt selection in a blazer outfit.
 *
 * Rules:
 *   - White shirt is always the best choice → big bonus
 *   - Light colored blazer + black shirt + black pants = top rated
 *   - If no white/black shirt: lightest color shirt gets a bonus
 */
function blazerShirtBonus(shirtItem, blazerItem, bottomItem) {
  const shirtColor = (shirtItem.attributes?.color || "").toLowerCase().trim();
  const blazerColor = (blazerItem.attributes?.color || "").toLowerCase().trim();
  const pantsColor = (bottomItem.attributes?.color || "").toLowerCase().trim();

  // Light blazer + black shirt + black pants = highest rated
  if (isLightColor(blazerColor)) {
    if (shirtColor === "black" && pantsColor === "black") return 15;
    if (shirtColor === "white") return 12;
    // Prefer lighter shirts as fallback
    if (isLightColor(shirtColor)) return 3;
    return 0;
  }

  // For dark/matching blazers: white shirt is king
  if (shirtColor === "white") return 12;
  // Lightest available shirt gets a small bonus
  if (isLightColor(shirtColor)) return 5;
  return 0;
}

function generateOutfits(clothingItems, options = {}) {
  const { minScore = 50, maxPerCategory = 50 } = options;

  // ─ 1. Categorize all items ────────────────────────────────────────
  const categorized = {
    topwear: [],
    bottomwear: [],
    fullbody: [],
    footwear: [],
    accessories: [],
  };

  for (const item of clothingItems) {
    const type = categorizeItem(item);
    if (type && categorized[type]) {
      categorized[type].push(item);
    }
  }

  // ─ 2. Check minimum requirements ─────────────────────────────────
  const hasTopBottom =
    categorized.topwear.length > 0 && categorized.bottomwear.length > 0;
  const hasFullbody = categorized.fullbody.length > 0;

  if (!categorized.footwear.length || (!hasTopBottom && !hasFullbody)) {
    return {
      outfits: [],
      summary: {
        topwear: categorized.topwear.length,
        bottomwear: categorized.bottomwear.length,
        fullbody: categorized.fullbody.length,
        footwear: categorized.footwear.length,
        accessories: categorized.accessories.length,
        message:
          "Need (topwear + bottomwear OR fullbody) + footwear to generate outfits",
      },
    };
  }

  // ─ 3. Generate compound topwear configs (single + layered) ───────
  const topConfigs =
    categorized.topwear.length > 0
      ? generateTopwearConfigs(categorized.topwear)
      : [];

  // ─ 4. Combine: topConfig × bottom × footwear + rule-based accessories
  const scored = [];

  // ─ Pre-compute wardrobe-level flags for shoe/accessory coordination ─
  const allShoeColors = new Set(
    categorized.footwear
      .map((s) => (s.attributes?.color || "").toLowerCase().trim())
      .filter(Boolean),
  );

  const BROWN_FAMILY = ["brown", "tan", "cognac", "camel"];
  const isBrownFamily = (c) => BROWN_FAMILY.includes(c);

  const hasBlackShoe = allShoeColors.has("black");
  const hasBrownShoe = categorized.footwear.some((s) =>
    isBrownFamily((s.attributes?.color || "").toLowerCase().trim()),
  );
  const hasBrownBelt = categorized.accessories.some(
    (a) =>
      getAccessoryType(a) === "belt" &&
      isBrownFamily((a.attributes?.color || "").toLowerCase().trim()),
  );
  const hasBrownWatch = categorized.accessories.some(
    (a) =>
      getAccessoryType(a) === "watch" &&
      isBrownFamily((a.attributes?.color || "").toLowerCase().trim()),
  );
  const hasCompleteBrownSet = hasBrownShoe && hasBrownBelt && hasBrownWatch;

  // Pre-compute: does the user have casual topwear?
  const hasCasualTops = categorized.topwear.some(
    (t) => getItemFormality(t) === "casual",
  );

  // Pre-compute: does the user have casual or versatile footwear?
  const hasCasualOrVersatileShoes = categorized.footwear.some((s) => {
    const f = getItemFormality(s);
    return f === "casual" || f === "versatile";
  });

  // Shoe-pant color penalty:
  // Brown shoes + dark pants (charcoal, grey) = bad if black shoes exist.
  // Black shoes + warm pants (beige, navy) = bad if full brown set exists.
  function shoePantColorPenalty(shoe, bottom) {
    const shoeColor = (shoe.attributes?.color || "").toLowerCase().trim();
    const bottomColor = (bottom.attributes?.color || "").toLowerCase().trim();
    if (!shoeColor || !bottomColor) return 0;

    // Brown shoes with dark-tone pants → penalize if black shoe available
    if (isBrownFamily(shoeColor)) {
      if (hasBlackShoe && BLACK_SHOE_GOOD_PANTS.has(bottomColor)) return -25;
      return 0;
    }

    // Black shoes with warm-tone pants → penalize if complete brown set available
    if (shoeColor === "black") {
      if (hasCompleteBrownSet && BROWN_SHOE_GOOD_PANTS.has(bottomColor))
        return -25;
      return 0;
    }

    return 0;
  }

  // Belt-shoe mismatch penalty:
  // If belt doesn't match shoe color AND another shoe exists that would
  // match the belt → heavy penalty (prefer the matching shoe combo).
  // If NO shoe matches the belt at all → no penalty (it's the only option).
  function beltShoeMismatchPenalty(shoe, accSet) {
    const shoeColor = (shoe.attributes?.color || "").toLowerCase().trim();
    const belt = accSet.find((a) => getAccessoryType(a) === "belt");
    if (!belt) return 0;
    const beltColor = (belt.attributes?.color || "").toLowerCase().trim();
    if (!beltColor || !shoeColor) return 0;
    if (beltColor === shoeColor) return 0; // perfect match, no penalty
    // Belt doesn't match shoe — is there another shoe that would match?
    if (allShoeColors.has(beltColor)) return -50; // a better shoe exists → near-reject
    return 0; // no matching shoe at all, allow the mismatch
  }

  // Watch must match shoe/belt color.
  // If watch doesn't match shoe AND doesn't match belt → heavy penalty
  // (only if a better shoe exists that would align everything).
  function watchShoeMismatchPenalty(shoe, accSet) {
    const shoeColor = (shoe.attributes?.color || "").toLowerCase().trim();
    const watch = accSet.find((a) => getAccessoryType(a) === "watch");
    if (!watch) return 0;
    const watchColor = (watch.attributes?.color || "").toLowerCase().trim();
    if (!watchColor || !shoeColor) return 0;

    // Watch matches shoe → perfect
    if (watchColor === shoeColor) return 0;

    // Check belt color too — watch matching belt is also acceptable
    const belt = accSet.find((a) => getAccessoryType(a) === "belt");
    const beltColor = belt
      ? (belt.attributes?.color || "").toLowerCase().trim()
      : "";
    if (beltColor && watchColor === beltColor) return 0;

    // Watch mismatches both shoe and belt — is there a shoe that matches?
    if (allShoeColors.has(watchColor)) return -50; // near-reject
    return 0; // no matching shoe exists, allow the mismatch
  }

  // 4a. Normal outfits: top(s) + bottom + footwear + selected accessories
  for (const topConfig of topConfigs) {
    const primaryTop = topConfig.items[0];
    const primaryFormality = getItemFormality(primaryTop);

    // Determine effective top formality (outer layer can elevate)
    let effectiveTopFormality = primaryFormality;
    let hasFormalOuter = false;
    let outerLayer = null;
    if (topConfig.layered && topConfig.items.length > 1) {
      outerLayer = topConfig.items[topConfig.items.length - 1];
      const outerFormality = getItemFormality(outerLayer);
      const outerSub = (outerLayer.subCategory || "").toLowerCase().trim();

      if (outerFormality === "formal") {
        hasFormalOuter = true;
        if (primaryFormality === "casual")
          effectiveTopFormality = "semi-formal";
      }

      // ── Casual outer layer in formal outfits guard ──
      // Block casual sweatshirts/hoodies/bombers etc. in formal outfits
      // unless the item is tagged formal/business or is plain/solid
      if (CASUAL_OUTER_SUBS.has(outerSub)) {
        // This outer is inherently casual — check if it's acceptable for formal
        if (!isCasualOuterAllowedInFormal(outerLayer)) {
          // Only allow in fully casual outfits (will be checked per-bottom below)
          // For now mark it so we can skip formal combos
          if (
            primaryFormality === "formal" ||
            primaryFormality === "semi-formal"
          )
            continue; // formal inner + casual outer = skip entirely
        }
      }
    }

    // Detect if outer layer is a blazer
    const isBlazerOutfit =
      outerLayer &&
      BLAZER_TYPES.has((outerLayer.subCategory || "").toLowerCase().trim());

    for (const bottom of categorized.bottomwear) {
      const bottomFormality = getItemFormality(bottom);

      // HARD RULE: Formal bottom + casual effective top = NEVER
      if (bottomFormality === "formal" && effectiveTopFormality === "casual")
        continue;

      // Formal top + casual bottom: only black/white formal shirts
      // (unless user has no casual tops, or a formal outer layer like blazer)
      if (
        primaryFormality === "formal" &&
        bottomFormality === "casual" &&
        !hasFormalOuter
      ) {
        const topColor = (primaryTop.attributes?.color || "")
          .toLowerCase()
          .trim();
        if (topColor !== "black" && topColor !== "white" && hasCasualTops)
          continue;
      }

      // Skip if primary top color is too similar to bottom color
      const bottomColor = (bottom.attributes?.color || "").toLowerCase().trim();
      const primaryTopColor = (primaryTop.attributes?.color || "")
        .toLowerCase()
        .trim();
      if (areTooSimilar(primaryTopColor, bottomColor)) continue;

      // ── Blazer-pants color matching ──
      // If this is a blazer outfit, check blazer-pants color compatibility.
      // Exact match (suit) = huge bonus, light+dark complement = good,
      // otherwise skip this blazer-pants combo.
      let blazerBonus = 0;
      if (isBlazerOutfit) {
        const blazerColor = (outerLayer.attributes?.color || "")
          .toLowerCase()
          .trim();
        const bpScore = blazerPantsColorScore(blazerColor, bottomColor);
        if (!bpScore.allowed) continue; // no complement → skip
        blazerBonus += bpScore.bonus;

        // Shirt priority in blazer outfits
        blazerBonus += blazerShirtBonus(primaryTop, outerLayer, bottom);
      }

      // ── Casual outer layer + formal bottom guard ──
      // If we have a casual outer layer and the bottom is formal,
      // skip unless the outer is allowed in formal contexts
      if (
        outerLayer &&
        CASUAL_OUTER_SUBS.has(
          (outerLayer.subCategory || "").toLowerCase().trim(),
        ) &&
        !isCasualOuterAllowedInFormal(outerLayer) &&
        bottomFormality === "formal"
      )
        continue;

      // Determine outfit category for this top+bottom combo
      const category = classifyOutfitCategory(
        effectiveTopFormality,
        bottomFormality,
      );
      const isCasualOutfit = category === "Casual";
      const isSmartCasual =
        primaryFormality === "formal" && bottomFormality === "casual";

      for (const shoe of categorized.footwear) {
        const shoeFormality = getItemFormality(shoe);
        const shoeSub = (shoe.subCategory || "").toLowerCase().trim();

        // In casual outfits: skip formal shoes (except boots/versatile)
        // Allow formal shoes only if user has no casual or versatile shoes
        if (isCasualOutfit && shoeFormality === "formal") {
          if (hasCasualOrVersatileShoes) continue;
        }

        // In formal outfits: never use casual footwear (sneakers, sandals, etc.)
        if (category === "Formal" && shoeFormality === "casual") continue;

        const ctx = buildOutfitContext(topConfig, bottom, shoe);
        const accSet = selectAccessoriesForOutfit(categorized.accessories, ctx);
        let score = scoreOutfit(topConfig, bottom, shoe, accSet);

        // Footwear preference for formal-top + casual-bottom outfits:
        // boots > sneakers/casual > formal shoes
        let formalCasualShoeBonus = 0;
        if (isSmartCasual) {
          if (shoeSub === "boots") formalCasualShoeBonus = 15;
          else if (shoeFormality === "casual") formalCasualShoeBonus = 10;
          // formal shoes get 0 (allowed but not preferred)
        }

        // Belt-shoe and watch-shoe coordination only matters for formal/leather
        // shoes. Casual footwear (sneakers, sandals) don't need belt/watch matching.
        const isFormalShoe = shoeFormality === "formal";

        score = Math.max(
          0,
          score +
            (isFormalShoe ? beltShoeMismatchPenalty(shoe, accSet) : 0) +
            (isFormalShoe ? watchShoeMismatchPenalty(shoe, accSet) : 0) +
            shoePantColorPenalty(shoe, bottom) +
            formalCasualShoeBonus +
            blazerBonus,
        );

        if (score >= minScore) {
          scored.push({
            top: topConfig.items.map((t) => ({
              id: t._id,
              name: t.itemName,
              subCategory: t.subCategory,
              color: t.attributes?.color,
              style: t.style,
            })),
            layered: topConfig.layered,
            bottom: {
              id: bottom._id,
              name: bottom.itemName,
              subCategory: bottom.subCategory,
              color: bottom.attributes?.color,
              style: bottom.style,
            },
            footwear: {
              id: shoe._id,
              name: shoe.itemName,
              subCategory: shoe.subCategory,
              color: shoe.attributes?.color,
              style: shoe.style,
            },
            accessories: accSet.map((a) => ({
              id: a._id,
              name: a.itemName,
              subCategory: a.subCategory,
              color: a.attributes?.color,
            })),
            score,
            category,
          });
        }
      }
    }
  }

  // 4b. Fullbody outfits: fullbody + footwear + selected accessories
  for (const fb of categorized.fullbody) {
    const fbConfig = { items: [fb], layered: false, layerScore: 100 };
    for (const shoe of categorized.footwear) {
      const ctx = buildOutfitContext(fbConfig, fb, shoe);
      const accSet = selectAccessoriesForOutfit(categorized.accessories, ctx);
      let score = scoreOutfit(fbConfig, fb, shoe, accSet);

      const fbShoeFormality = getItemFormality(shoe);
      const isFbFormalShoe = fbShoeFormality === "formal";
      score = Math.max(
        0,
        score +
          (isFbFormalShoe ? beltShoeMismatchPenalty(shoe, accSet) : 0) +
          (isFbFormalShoe ? watchShoeMismatchPenalty(shoe, accSet) : 0) +
          shoePantColorPenalty(shoe, fb),
      );

      if (score >= minScore) {
        const fbFormality = getItemFormality(fb);
        const fbCategory =
          fbFormality === "formal"
            ? "Formal"
            : fbFormality === "casual"
              ? "Casual"
              : "Semi-Formal";

        scored.push({
          top: [
            {
              id: fb._id,
              name: fb.itemName,
              subCategory: fb.subCategory,
              color: fb.attributes?.color,
              style: fb.style,
            },
          ],
          layered: false,
          fullbody: true,
          bottom: null,
          footwear: {
            id: shoe._id,
            name: shoe.itemName,
            subCategory: shoe.subCategory,
            color: shoe.attributes?.color,
            style: shoe.style,
          },
          accessories: accSet.map((a) => ({
            id: a._id,
            name: a.itemName,
            subCategory: a.subCategory,
            color: a.attributes?.color,
          })),
          score,
          category: fbCategory,
        });
      }
    }
  }

  // ─ 5. Per-category cap: top N per category ────────────────────────
  scored.sort((a, b) => b.score - a.score);

  const categoryBuckets = {};
  const topOutfits = [];
  for (const outfit of scored) {
    const cat = outfit.category || "Casual";
    if (!categoryBuckets[cat]) categoryBuckets[cat] = 0;
    if (categoryBuckets[cat] < maxPerCategory) {
      topOutfits.push(outfit);
      categoryBuckets[cat]++;
    }
  }

  return {
    outfits: topOutfits,
    summary: {
      generated: scored.length,
      returned: topOutfits.length,
      topwear: categorized.topwear.length,
      bottomwear: categorized.bottomwear.length,
      fullbody: categorized.fullbody.length,
      footwear: categorized.footwear.length,
      accessories: categorized.accessories.length,
      topConfigs: topConfigs.length,
      averageScore: topOutfits.length
        ? Math.round(
            (topOutfits.reduce((s, o) => s + o.score, 0) / topOutfits.length) *
              100,
          ) / 100
        : 0,
    },
  };
}

module.exports = {
  generateOutfits,
  scoreOutfit,
  categorizeItem,
  getItemFormality,
  classifyOutfitCategory,
};
