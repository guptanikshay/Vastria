/**
 * Accessory System v2
 *
 * Rule-based accessory selection — picks exactly the right accessories
 * for each outfit the way a human would dress:
 *   - Belt: must-have; formal → match shoe color, casual → black default
 *   - Watch: must-have; formal → analog, casual → digital; color match
 *   - Socks: must for formal & closed shoes; formal → black; casual → match shoe
 *   - Tie: only with blazer/suit + collared shirt; complement colors
 *   - Headwear: casual only; color match
 *   - Eyewear: any outfit; color match
 *   - Scarf: any outfit if color coordinates well
 */

// ── Accessory type detection ────────────────────────────────────────

function getAccessoryType(item) {
  const sub = (item.subCategory || "").toLowerCase().trim();
  const name = (item.itemName || "").toLowerCase().trim();

  if (sub.includes("belt")) return "belt";
  if (sub.includes("watch") || name.includes("watch")) return "watch";
  if (sub.includes("sock")) return "socks";
  if (sub === "tie" || sub === "bow tie" || sub === "necktie") return "tie";
  if (
    [
      "cap",
      "hat",
      "beanie",
      "fedora",
      "beret",
      "bucket hat",
      "baseball cap",
    ].some((h) => sub.includes(h))
  )
    return "headwear";
  if (sub.includes("sunglasses") || sub === "glasses") return "eyewear";
  if (["scarf", "stole", "muffler", "dupatta"].some((s) => sub.includes(s)))
    return "scarf";

  return "other";
}

function groupAccessoriesByType(accessories) {
  const groups = {};
  for (const acc of accessories) {
    const type = getAccessoryType(acc);
    if (!groups[type]) groups[type] = [];
    groups[type].push(acc);
  }
  return groups;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getColor(item) {
  return (item.attributes?.color || "").toLowerCase().trim();
}

function colorsMatch(c1, c2) {
  if (!c1 || !c2) return false;
  return c1.toLowerCase().trim() === c2.toLowerCase().trim();
}

const NEUTRAL_COLORS = new Set([
  "black",
  "white",
  "grey",
  "gray",
  "silver",
  "beige",
  "brown",
  "navy",
  "navy blue",
]);

/**
 * Pick the best color-matching item from a list.
 * Priority: exact match with outfit color > neutral > other.
 */
function bestColorMatch(items, outfitColors) {
  if (!items?.length) return null;
  if (items.length === 1) return items[0];

  const normColors = outfitColors
    .map((c) => (c || "").toLowerCase().trim())
    .filter(Boolean);

  let bestItem = items[0];
  let bestScore = -1;

  for (const item of items) {
    const c = getColor(item);
    let score = 0;
    if (normColors.includes(c)) score = 3;
    else if (NEUTRAL_COLORS.has(c)) score = 2;
    else score = 1;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }
  return bestItem;
}

function isAnalogWatch(item) {
  const name = (item.itemName || "").toLowerCase();
  const sub = (item.subCategory || "").toLowerCase();
  return (
    name.includes("analog") ||
    name.includes("analogue") ||
    sub.includes("analog") ||
    sub.includes("analogue")
  );
}

// Footwear that should NOT have socks
const NO_SOCKS_FOOTWEAR = new Set([
  "sandals",
  "flip-flops",
  "slippers",
  "mules",
  "slides",
  "espadrilles",
  "loafers",
  "boat shoes",
  "juttis",
  "kolhapuri",
  "mojari",
  "heels",
  "flats",
]);

// ── Per-type selection rules ────────────────────────────────────────

/**
 * Belt — must-have.
 * #1 rule: belt color must match shoe color (always).
 * Fallback: formal → closest to shoe, casual → prefer black.
 */
function pickBelt(belts, { isFormal, shoeColor }) {
  if (!belts?.length) return null;
  if (belts.length === 1) return belts[0];

  // Always try shoe color match first — belt=shoe is the top rule
  if (shoeColor) {
    const match = belts.find((b) => colorsMatch(getColor(b), shoeColor));
    if (match) return match;
  }

  // Fallback when no exact shoe match exists
  if (isFormal) return bestColorMatch(belts, [shoeColor]);
  const black = belts.find((b) => getColor(b) === "black");
  return black || belts[0];
}

/**
 * Watch — must-have.
 * Rule: watch color MUST match shoe/belt color.
 * Step 1: find a watch matching shoe color (across all watches).
 * Step 2: if not found, try type preference + outfit color fallback.
 */
function pickWatch(watches, { isFormal, shoeColor, outfitColors }) {
  if (!watches?.length) return null;
  if (watches.length === 1) return watches[0];

  // Priority 1: ANY watch that matches shoe color (strongest rule)
  if (shoeColor) {
    const shoeMatch = watches.find((w) => colorsMatch(getColor(w), shoeColor));
    if (shoeMatch) return shoeMatch;
  }

  // Priority 2: type preference + outfit color fallback
  const analog = watches.filter((w) => isAnalogWatch(w));
  const digital = watches.filter((w) => !isAnalogWatch(w));
  const pool = isFormal
    ? analog.length
      ? analog
      : watches
    : digital.length
      ? digital
      : watches;

  return bestColorMatch(pool, outfitColors);
}

/**
 * Socks — must for formal & closed-toe shoes.
 * Formal: black socks preferred.
 * Casual: match shoe color.
 * Skip for sandals, loafers, flip-flops, etc.
 */
function pickSocks(socks, { isFormal, shoeColor, shoeSubCategory }) {
  if (!socks?.length) return null;

  // No socks with open/slip-on footwear
  if (NO_SOCKS_FOOTWEAR.has((shoeSubCategory || "").toLowerCase().trim()))
    return null;

  if (socks.length === 1) return socks[0];

  if (isFormal) {
    // Black socks for formal
    const black = socks.find((s) => getColor(s) === "black");
    return black || socks[0];
  }

  // Casual: match shoe color, fallback to white/black
  const match = socks.find((s) => colorsMatch(getColor(s), shoeColor));
  if (match) return match;
  const white = socks.find((s) => getColor(s) === "white");
  return white || socks[0];
}

/**
 * Tie — formal only, requires collared shirt + blazer/suit jacket.
 *
 * Fashion rules for ties:
 *   - Only with button-down collared shirts (not t-shirts, polos, henleys)
 *   - Best paired with a blazer or suit jacket
 *   - Without jacket: acceptable in business-casual but we skip for simplicity
 *   - Color should complement (not match) the shirt
 *   - Dark ties go with light shirts, and vice versa
 *   - Solid ties are most versatile
 */
function pickTie(
  ties,
  { isFormal, hasCollaredShirt, hasBlazer, outfitColors },
) {
  if (!ties?.length) return null;

  // Only formal outfits with blazer + collared shirt
  if (!isFormal || !hasCollaredShirt || !hasBlazer) return null;

  if (ties.length === 1) return ties[0];
  return bestColorMatch(ties, outfitColors);
}

/**
 * Headwear (cap/hat/beanie) — casual only.
 * Never with formal outfits.
 * Color match with outfit.
 */
function pickHeadwear(hats, { isFormal, outfitColors }) {
  if (!hats?.length) return null;
  if (isFormal) return null;

  if (hats.length === 1) return hats[0];
  return bestColorMatch(hats, outfitColors);
}

/**
 * Eyewear (sunglasses) — works with any outfit.
 * Multiple: color match (frame color with outfit).
 */
function pickEyewear(eyewear, { outfitColors }) {
  if (!eyewear?.length) return null;
  if (eyewear.length === 1) return eyewear[0];
  return bestColorMatch(eyewear, outfitColors);
}

/**
 * Scarf — any outfit, selected by color coordination.
 */
function pickScarf(scarves, { outfitColors }) {
  if (!scarves?.length) return null;
  if (scarves.length === 1) return scarves[0];
  return bestColorMatch(scarves, outfitColors);
}

// ── Main selection function ─────────────────────────────────────────

/**
 * Select the right accessories for an outfit using real dressing rules.
 *
 * @param {Array}  accessories - All user's accessory items
 * @param {Object} context     - Outfit context
 * @param {boolean} context.isFormal        - Is this a formal outfit?
 * @param {string}  context.shoeColor       - Color of the footwear
 * @param {string}  context.shoeSubCategory - SubCategory of the footwear
 * @param {Array}   context.outfitColors    - All garment colors in the outfit
 * @param {boolean} context.hasCollaredShirt - Does the outfit include a collared shirt?
 * @param {boolean} context.hasBlazer       - Does the outfit include a blazer/suit?
 * @returns {Array} - Selected accessories (one per type, only what fits)
 */
function selectAccessoriesForOutfit(accessories, context) {
  if (!accessories.length) return [];

  const groups = groupAccessoriesByType(accessories);
  const selected = [];

  // Belt — must-have
  const belt = pickBelt(groups.belt, context);
  if (belt) selected.push(belt);

  // Watch — must-have
  const watch = pickWatch(groups.watch, context);
  if (watch) selected.push(watch);

  // Socks — must for formal + closed shoes
  const sock = pickSocks(groups.socks, context);
  if (sock) selected.push(sock);

  // Tie — formal + blazer + collared shirt only
  const tie = pickTie(groups.tie, context);
  if (tie) selected.push(tie);

  // Headwear — casual only
  const hat = pickHeadwear(groups.headwear, context);
  if (hat) selected.push(hat);

  // Eyewear — any outfit
  const glasses = pickEyewear(groups.eyewear, context);
  if (glasses) selected.push(glasses);

  // Scarf — any outfit, color match
  const scarf = pickScarf(groups.scarf, context);
  if (scarf) selected.push(scarf);

  return selected;
}

module.exports = {
  selectAccessoriesForOutfit,
  getAccessoryType,
  groupAccessoriesByType,
};
