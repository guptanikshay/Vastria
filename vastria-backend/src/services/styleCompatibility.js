/**
 * Style & Formality Compatibility Engine v2
 *
 * Two-layer system:
 *   1. Formality level — hard constraint (formal shoes + gym shorts = heavy penalty)
 *   2. Style affinity  — soft scoring (casual + streetwear = good, casual + ethnic = meh)
 */

// ── Formality levels (1 = very casual, 5 = very formal) ────────────

const FORMALITY = {
  casual: 1,
  streetwear: 1,
  sporty: 1,
  "gen-z": 1,
  bohemian: 2,
  minimalist: 2,
  trendy: 2,
  ethnic: 3,
  "smart casual": 3,
  "semi-formal": 3,
  "ethnic formal": 4,
  business: 4,
  formal: 5,
  elegant: 5,
};

// ── Style affinity groups ───────────────────────────────────────────
// Items within the same group work well together.

const STYLE_GROUPS = {
  casual: ["casual", "streetwear", "minimalist", "trendy", "gen-z"],
  formal: ["formal", "business", "elegant", "semi-formal", "smart casual"],
  sporty: ["sporty", "casual", "streetwear"],
  ethnic: ["ethnic", "bohemian", "minimalist"],
};

// ── Explicit affinity matrix (higher = better) ─────────────────────

const AFFINITY = {
  casual_casual: 100,
  casual_streetwear: 88,
  casual_minimalist: 82,
  casual_trendy: 85,
  "casual_gen-z": 85,
  casual_sporty: 78,
  streetwear_streetwear: 100,
  streetwear_trendy: 90,
  "streetwear_gen-z": 92,
  streetwear_sporty: 82,
  minimalist_minimalist: 100,
  minimalist_elegant: 75,
  "minimalist_smart casual": 78,
  trendy_trendy: 100,
  "trendy_gen-z": 92,
  sporty_sporty: 100,
  formal_formal: 100,
  formal_business: 92,
  formal_elegant: 95,
  "formal_semi-formal": 90,
  "formal_smart casual": 78,
  business_business: 100,
  business_elegant: 88,
  "business_semi-formal": 90,
  "business_smart casual": 85,
  elegant_elegant: 100,
  "elegant_semi-formal": 85,
  "semi-formal_semi-formal": 100,
  "semi-formal_smart casual": 88,
  "smart casual_smart casual": 100,
  ethnic_ethnic: 100,
  ethnic_bohemian: 90,
  "ethnic_ethnic formal": 88,
  ethnic_elegant: 72,
  "ethnic formal_ethnic formal": 100,
  "ethnic formal_formal": 82,
  "ethnic formal_elegant": 85,
  bohemian_bohemian: 100,
};

// ── Public API ──────────────────────────────────────────────────────

/**
 * Return the formality level (1-5) for a style string.
 */
function getFormalityLevel(style) {
  return FORMALITY[(style || "").toLowerCase().trim()] || 2;
}

/**
 * Score how compatible two style arrays are.
 * Returns 0-100.
 */
function getStyleScore(styles1 = [], styles2 = []) {
  if (!styles1.length && !styles2.length) return 70;
  if (!styles1.length || !styles2.length) return 65;

  const s1 = styles1[0].toLowerCase().trim();
  const s2 = styles2[0].toLowerCase().trim();

  if (s1 === s2) return 100;

  // Direct affinity lookup (bidirectional)
  const key1 = `${s1}_${s2}`;
  const key2 = `${s2}_${s1}`;
  if (AFFINITY[key1] !== undefined) return AFFINITY[key1];
  if (AFFINITY[key2] !== undefined) return AFFINITY[key2];

  // Same group fallback
  for (const group of Object.values(STYLE_GROUPS)) {
    if (group.includes(s1) && group.includes(s2)) return 72;
  }

  return 45; // mismatched styles
}

/**
 * Compute a formality consistency penalty across all items in an outfit.
 * Returns a multiplier 0.0 – 1.0.
 *
 * If the gap between max and min formality in the outfit is too large,
 * the outfit is penalised.  e.g. formal shoes (5) + gym shorts (1) → heavy penalty.
 */
function formalityPenalty(items) {
  const levels = items
    .map((item) => {
      const s = (item.style && item.style[0]) || "";
      return getFormalityLevel(s);
    })
    .filter(Boolean);

  if (levels.length < 2) return 1.0;

  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const gap = max - min;

  if (gap === 0) return 1.0; // perfectly consistent
  if (gap === 1) return 0.95; // minor mismatch, fine
  if (gap === 2) return 0.8; // noticeable
  if (gap === 3) return 0.55; // bad
  return 0.3; // formal + very casual = terrible
}

module.exports = {
  getStyleScore,
  getFormalityLevel,
  formalityPenalty,
  FORMALITY,
  STYLE_GROUPS,
};
