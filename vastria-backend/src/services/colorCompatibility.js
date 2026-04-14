/**
 * Color Compatibility Engine v2
 *
 * Full color-pair guide with scored lookups, monochrome detection,
 * dominant-color-count penalty, and accessory-matching bonus.
 */

// ── Canonical color pairs from the style guide ──────────────────────
// Each entry is [colorA, colorB, score].  Score 90-100 = excellent,
// 80-89 = great, 70-79 = good.  Anything not listed defaults to a
// lower base score computed from color families.

const COLOR_PAIRS = [
  // Neutral-based
  ["white", "black", 95],
  ["white", "grey", 90],
  ["white", "gray", 90],
  ["white", "beige", 90],
  ["white", "navy blue", 92],
  ["white", "navy", 92],
  ["white", "olive green", 85],
  ["white", "olive", 85],
  ["white", "brown", 85],
  ["black", "grey", 88],
  ["black", "gray", 88],
  ["black", "beige", 85],
  ["black", "camel", 85],
  ["black", "olive green", 82],
  ["black", "olive", 82],
  ["black", "burgundy", 88],
  ["grey", "white", 90],
  ["grey", "navy", 88],
  ["grey", "navy blue", 88],
  ["grey", "pastel pink", 82],
  ["grey", "baby pink", 82],
  ["grey", "lavender", 82],
  ["grey", "burgundy", 85],
  ["gray", "navy", 88],
  ["gray", "pastel pink", 82],
  ["gray", "baby pink", 82],
  ["gray", "lavender", 82],
  ["gray", "burgundy", 85],
  ["beige", "white", 90],
  ["beige", "olive", 85],
  ["beige", "olive green", 85],
  ["beige", "light blue", 84],

  // Blue-based
  ["light blue", "dark blue", 88],
  ["light blue", "white", 90],
  ["light blue", "beige", 84],
  ["light blue", "grey", 82],
  ["light blue", "gray", 82],
  ["navy blue", "white", 92],
  ["navy blue", "khaki", 85],
  ["navy blue", "mustard", 84],
  ["navy blue", "burgundy", 86],
  ["navy blue", "light pink", 80],
  ["navy blue", "baby pink", 80],
  ["navy", "white", 92],
  ["navy", "khaki", 85],
  ["navy", "mustard", 84],
  ["navy", "burgundy", 86],
  ["navy", "light pink", 80],

  // Earthy tones
  ["olive green", "beige", 85],
  ["olive green", "white", 85],
  ["olive green", "black", 82],
  ["olive green", "brown", 83],
  ["olive", "beige", 85],
  ["olive", "white", 85],
  ["olive", "black", 82],
  ["olive", "brown", 83],
  ["brown", "beige", 88],
  ["brown", "cream", 87],
  ["brown", "olive", 83],
  ["brown", "light blue", 80],
  ["camel", "white", 86],
  ["camel", "black", 85],
  ["camel", "navy", 84],

  // Pastels
  ["baby pink", "white", 88],
  ["baby pink", "grey", 82],
  ["baby pink", "gray", 82],
  ["baby pink", "light blue", 80],
  ["pastel pink", "white", 88],
  ["pastel pink", "grey", 82],
  ["lavender", "white", 87],
  ["lavender", "grey", 82],
  ["lavender", "gray", 82],
  ["lavender", "pastel yellow", 78],
  ["mint green", "white", 86],
  ["mint green", "beige", 82],

  // Bold combos
  ["red", "white", 85],
  ["red", "black", 88],
  ["red", "denim blue", 80],
  ["red", "blue", 76],
  ["yellow", "navy blue", 82],
  ["yellow", "navy", 82],
  ["mustard", "white", 84],
  ["mustard", "black", 85],
  ["green", "white", 84],
  ["emerald green", "beige", 83],
  ["emerald green", "black", 86],
  ["emerald", "beige", 83],
  ["emerald", "black", 86],

  // High-fashion combos
  ["burgundy", "beige", 86],
  ["burgundy", "navy", 85],
  ["rust", "cream", 83],
  ["rust", "olive", 80],
  ["teal", "grey", 82],
  ["teal", "gray", 82],
  ["teal", "white", 85],
];

// ── Build fast lookup map (bidirectional) ───────────────────────────

const _pairMap = new Map();

function _pairKey(a, b) {
  return `${a}|||${b}`;
}

for (const [a, b, score] of COLOR_PAIRS) {
  _pairMap.set(_pairKey(a, b), score);
  _pairMap.set(_pairKey(b, a), score);
}

// ── Color families for fallback scoring ─────────────────────────────

const NEUTRALS = new Set([
  "white",
  "black",
  "grey",
  "gray",
  "beige",
  "cream",
  "navy",
  "navy blue",
  "khaki",
  "camel",
  "charcoal",
]);

const MONOCHROME_FAMILIES = {
  white: ["white", "cream", "ivory", "off-white"],
  black: ["black", "charcoal"],
  grey: ["grey", "gray", "charcoal", "silver"],
  brown: ["brown", "camel", "tan", "chocolate", "beige", "cream", "rust"],
  blue: [
    "light blue",
    "blue",
    "dark blue",
    "navy",
    "navy blue",
    "denim blue",
    "teal",
    "sky blue",
  ],
};

// ── Public API ──────────────────────────────────────────────────────

/**
 * Score how well two colors go together.
 * Returns 0-100.
 */
function getColorScore(color1, color2) {
  const c1 = (color1 || "").toLowerCase().trim();
  const c2 = (color2 || "").toLowerCase().trim();

  if (!c1 || !c2) return 65; // unknown → neutral-ish

  // Exact match (monochrome)
  if (c1 === c2) return 100;

  // Direct lookup from curated pairs
  const direct = _pairMap.get(_pairKey(c1, c2));
  if (direct !== undefined) return direct;

  // Same monochrome family (shades of blue, shades of brown, etc.)
  for (const family of Object.values(MONOCHROME_FAMILIES)) {
    if (family.includes(c1) && family.includes(c2)) return 90;
  }

  // Neutral + anything = safe
  if (NEUTRALS.has(c1) || NEUTRALS.has(c2)) return 72;

  // Two bold / unmatched colors
  return 45;
}

/**
 * Count unique dominant colors in an outfit and return a penalty.
 * >3 distinct dominant colors → penalty applied.
 * Returns a multiplier (0.0 – 1.0).
 */
function colorCountPenalty(colors) {
  const unique = new Set(
    colors.filter(Boolean).map((c) => c.toLowerCase().trim()),
  );
  const count = unique.size;
  if (count <= 2) return 1.0; // perfect
  if (count === 3) return 0.95; // fine
  if (count === 4) return 0.82; // noticeable penalty
  return 0.65; // >4 colors — harsh penalty
}

/**
 * Score accessory color coordination with the outfit.
 * If accessories match key outfit colors → bonus.
 * Returns a bonus score 0-20 to add on top.
 */
function accessoryColorBonus(outfitColors, accessoryColors) {
  if (!accessoryColors.length) return 0;

  const outfitSet = new Set(
    outfitColors.filter(Boolean).map((c) => c.toLowerCase().trim()),
  );
  let matchCount = 0;

  for (const ac of accessoryColors) {
    const color = (ac || "").toLowerCase().trim();
    if (!color) continue;
    if (outfitSet.has(color)) {
      matchCount++;
      continue;
    }
    // Check if accessory color is compatible with any outfit color
    for (const oc of outfitSet) {
      if (getColorScore(color, oc) >= 80) {
        matchCount += 0.5;
        break;
      }
    }
  }

  // Up to 15 bonus points
  const bonus = Math.min(15, matchCount * 6);
  return bonus;
}

// ── "Too similar" color groups for top ↔ bottom rejection ───────────
// Colors within the same group look nearly identical when worn as
// top + bottom. These combos should be skipped entirely, not just
// scored lower. Each group is a set of visually indistinguishable shades.

const TOO_SIMILAR_GROUPS = [
  // Warm neutrals / sandy tones
  [
    "beige",
    "khaki",
    "tan",
    "sand",
    "taupe",
    "fawn",
    "camel",
    "cream",
    "ivory",
    "off-white",
  ],
  // Light brown / earthy tones
  ["light brown", "khaki", "tan", "camel", "sand", "beige"],
  // Pale warm tones that blend with khaki/beige
  ["pale yellow", "cream", "beige", "khaki", "ivory", "off-white"],
  // Mustard / golden tones
  ["mustard", "gold", "golden", "dark yellow", "amber"],
  // Grey family (light end)
  ["light grey", "light gray", "silver", "ash"],
  // Olive / army greens
  ["olive", "olive green", "army green", "dark green", "moss green", "moss"],
  // Dark blue family
  ["navy", "navy blue", "dark blue", "midnight blue"],
  // Brown / chocolate
  ["brown", "chocolate", "coffee", "dark brown", "espresso"],
  // Rust / warm reds
  ["rust", "burnt orange", "terracotta", "brick"],
  // Charcoal / dark grey
  ["charcoal", "dark grey", "dark gray", "graphite", "slate"],
];

// Pre-build a lookup: color → group index(es)
const _similarGroups = new Map();
for (let i = 0; i < TOO_SIMILAR_GROUPS.length; i++) {
  for (const color of TOO_SIMILAR_GROUPS[i]) {
    if (!_similarGroups.has(color)) _similarGroups.set(color, []);
    _similarGroups.get(color).push(i);
  }
}

/**
 * Check if two colors are too visually similar to be worn as top + bottom.
 * Returns true if they should NOT be paired.
 */
function areTooSimilar(color1, color2) {
  const c1 = (color1 || "").toLowerCase().trim();
  const c2 = (color2 || "").toLowerCase().trim();
  if (!c1 || !c2) return false;
  if (c1 === c2) return false; // exact match = monochrome, that's intentional
  const groups1 = _similarGroups.get(c1);
  if (!groups1) return false;
  const groups2 = _similarGroups.get(c2);
  if (!groups2) return false;
  // If they share any group → too similar
  return groups1.some((g) => groups2.includes(g));
}

module.exports = {
  getColorScore,
  colorCountPenalty,
  accessoryColorBonus,
  areTooSimilar,
  NEUTRALS,
  MONOCHROME_FAMILIES,
};
