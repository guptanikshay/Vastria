/**
 * AI Clothing Service
 *
 * 1. imageSearch       — SerpAPI Google Images search
 * 2. analyzeClothingImage — Gemini Vision extracts clothing details from an image URL
 * 3. parseClothingDetails — Extract attributes from free-text user notes
 */

const { model, withRetry } = require("../config/gemini");

// ── Valid values (used in prompts so Gemini picks from these) ───────

const VALID_CATEGORIES = [
  "topwear",
  "bottomwear",
  "footwear",
  "accessories",
  "fullbody",
];

const VALID_SUBCATEGORIES = {
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
    "jacket",
    "blazer",
    "coat",
    "overcoat",
    "bomber",
    "denim jacket",
    "leather jacket",
    "parka",
    "cardigan",
    "puffer",
    "trench coat",
    "kurta",
    "kurti",
    "sherwani",
    "nehru jacket",
    "bandhgala",
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
    "churidar",
    "salwar",
    "dhoti",
    "palazzo",
    "lehenga",
    "pattiala",
  ],
  fullbody: ["saree", "anarkali", "gown", "jumpsuit", "romper", "dress"],
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
    "sunglasses",
    "tie",
    "bow tie",
    "cufflinks",
    "pocket square",
    "socks",
    "dress socks",
    "athletic socks",
    "dupatta",
    "stole",
    "bangle",
    "ring",
    "earrings",
  ],
};

const VALID_STYLES = [
  "casual",
  "formal",
  "streetwear",
  "sporty",
  "ethnic",
  "elegant",
  "business",
  "bohemian",
  "minimalist",
  "vintage",
];

const VALID_OCCASIONS = [
  "casual",
  "formal",
  "party",
  "wedding",
  "office",
  "date",
  "gym",
  "outdoor",
  "festival",
  "daily",
];

const VALID_SEASONS = ["summer", "winter", "spring", "autumn", "all"];
const VALID_WEATHER = ["hot", "cold", "rainy", "mild", "windy", "all"];

// ── Image Search via SerpAPI ────────────────────────────────────────

/**
 * Searches Google Images via SerpAPI for clothing items.
 *
 * @param {string} query - e.g. "black formal shirt", "red nike sneakers"
 * @returns {Array} - Array of image results with title, thumbnail, original URL, source
 */
async function imageSearch(query) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) throw new Error("SERP_API_KEY is not configured");

  const params = new URLSearchParams({
    q: query,
    engine: "google_images",
    api_key: apiKey,
    gl: "in",
    hl: "en",
    google_domain: "google.co.in",
    ijn: 0,
    no_cache: true,
    device: "desktop",
  });

  const resp = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`SerpAPI error ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const results = (data.images_results || []).slice(0, 20).map((img) => ({
    title: img.title,
    thumbnail: img.thumbnail,
    original: img.original,
    source: img.source,
    width: img.original_width,
    height: img.original_height,
  }));

  return results;
}

// ── Gemini Vision: analyze a clothing image ─────────────────────────

/**
 * Sends an image URL to Gemini Vision and extracts structured clothing data.
 *
 * @param {string} imageUrl - URL of the clothing image to analyze
 * @returns {Object} - Structured clothing item data
 */
async function analyzeClothingImage(imageUrl) {
  // Fetch the image and convert to base64 for Gemini
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error("Failed to fetch image from URL");

  const arrayBuf = await imgResp.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString("base64");
  const mimeType = imgResp.headers.get("content-type") || "image/jpeg";

  const prompt = `You are a fashion expert. Analyze this clothing image and extract structured details.

Return a SINGLE JSON object with these EXACT fields:

{
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "subCategory": the specific type (pick from the valid list for the category),
  "itemName": a human-friendly descriptive name like "Black Slim Fit Cotton Formal Shirt",
  "attributes": {
    "color": primary color (lowercase, e.g. "black", "navy blue", "light grey"),
    "secondaryColors": array of secondary colors or empty [],
    "pattern": one of ["solid", "striped", "checkered", "plaid", "floral", "printed", "graphic", "abstract", "polka dot", "paisley", "camo"],
    "material": best guess from ["cotton", "polyester", "linen", "silk", "denim", "wool", "leather", "synthetic", "chiffon", "satin", "velvet", "khadi", "georgette", "rayon", "nylon"],
    "fit": best guess from ["slim", "regular", "oversized", "relaxed", "skinny", "loose", "tailored"],
    "length": one of ["cropped", "short", "regular", "long", "full", "midi", "maxi", "knee-length"] or null
  },
  "style": array from ${JSON.stringify(VALID_STYLES)} (1-2 values),
  "occasion": array from ${JSON.stringify(VALID_OCCASIONS)} (2-3 values),
  "season": array from ${JSON.stringify(VALID_SEASONS)},
  "weather": array from ${JSON.stringify(VALID_WEATHER)},
  "tags": array of 3-5 useful search tags,
  "brand": brand name if visible/recognizable, otherwise null
}

Valid subCategories by category:
${JSON.stringify(VALID_SUBCATEGORIES, null, 2)}

IMPORTANT:
- Return ONLY a JSON object, no markdown, no explanation
- All values lowercase except itemName and brand
- If multiple clothing items are visible, focus on the MAIN item
- Be honest about uncertainty — use best guesses for material/fit`;

  const result = await withRetry(() =>
    model.generateContent([prompt, { inlineData: { mimeType, data: base64 } }]),
  );

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);

  if (!parsed.category || !parsed.attributes?.color) {
    throw new Error("Gemini Vision returned incomplete data");
  }

  return parsed;
}

/**
 * Analyze a clothing image directly from a buffer (no URL fetch needed).
 *
 * @param {Buffer} buffer - The raw image buffer
 * @param {string} mimeType - e.g. "image/jpeg", "image/png"
 * @returns {Object} - Structured clothing item data
 */
async function analyzeClothingBuffer(buffer, mimeType) {
  const base64 = buffer.toString("base64");

  const prompt = `You are a fashion expert. Analyze this clothing image and extract structured details.

Return a SINGLE JSON object with these EXACT fields:

{
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "subCategory": the specific type (pick from the valid list for the category),
  "itemName": a human-friendly descriptive name like "Black Slim Fit Cotton Formal Shirt",
  "attributes": {
    "color": primary color (lowercase, e.g. "black", "navy blue", "light grey"),
    "secondaryColors": array of secondary colors or empty [],
    "pattern": one of ["solid", "striped", "checkered", "plaid", "floral", "printed", "graphic", "abstract", "polka dot", "paisley", "camo"],
    "material": best guess from ["cotton", "polyester", "linen", "silk", "denim", "wool", "leather", "synthetic", "chiffon", "satin", "velvet", "khadi", "georgette", "rayon", "nylon"],
    "fit": best guess from ["slim", "regular", "oversized", "relaxed", "skinny", "loose", "tailored"],
    "length": one of ["cropped", "short", "regular", "long", "full", "midi", "maxi", "knee-length"] or null
  },
  "style": array from ${JSON.stringify(VALID_STYLES)} (1-2 values),
  "occasion": array from ${JSON.stringify(VALID_OCCASIONS)} (2-3 values),
  "season": array from ${JSON.stringify(VALID_SEASONS)},
  "weather": array from ${JSON.stringify(VALID_WEATHER)},
  "tags": array of 3-5 useful search tags,
  "brand": brand name if visible/recognizable, otherwise null
}

Valid subCategories by category:
${JSON.stringify(VALID_SUBCATEGORIES, null, 2)}

IMPORTANT:
- Return ONLY a JSON object, no markdown, no explanation
- All values lowercase except itemName and brand
- If multiple clothing items are visible, focus on the MAIN item
- Be honest about uncertainty — use best guesses for material/fit`;

  const result = await withRetry(() =>
    model.generateContent([
      prompt,
      { inlineData: { mimeType: mimeType || "image/jpeg", data: base64 } },
    ]),
  );

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);

  if (!parsed.category || !parsed.attributes?.color) {
    throw new Error("Gemini Vision returned incomplete data");
  }

  return parsed;
}

// ── Parse: free-text notes → enhanced attributes ────────────────────

/**
 * Takes base form data + free-text notes and returns enhanced attributes.
 * The AI fills in missing fields and adjusts based on the notes.
 *
 * @param {Object} formData - Partial clothing data from the form
 * @param {string} notes - Free-text additional details from the user
 * @returns {Object} - Complete clothing item data
 */
async function parseClothingDetails(formData, notes) {
  const prompt = `You are a fashion-savvy clothing database assistant. A user is manually adding an item to their wardrobe.

They filled a form with this data:
${JSON.stringify(formData, null, 2)}

They also added these additional notes/comments:
"${notes}"

Your job: Return a SINGLE JSON object with the complete, enhanced clothing item data. Use the form data as the base, and use the notes to:
1. Fill in any missing fields
2. Correct any obvious mismatches (e.g. if notes say "silk" but form says "cotton", use "silk")
3. Add appropriate style/occasion/season/weather/tags based on the notes
4. Generate a good itemName if not provided

Return this EXACT structure:
{
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "subCategory": specific type from the valid list,
  "itemName": human-friendly name,
  "attributes": {
    "color": primary color (lowercase),
    "secondaryColors": [],
    "pattern": pattern type,
    "material": material type,
    "fit": fit type,
    "length": length or null
  },
  "style": array from ${JSON.stringify(VALID_STYLES)},
  "occasion": array from ${JSON.stringify(VALID_OCCASIONS)},
  "season": array from ${JSON.stringify(VALID_SEASONS)},
  "weather": array from ${JSON.stringify(VALID_WEATHER)},
  "tags": array of useful tags,
  "brand": brand name or null,
  "aiNotes": a brief summary of what the AI inferred from the notes (1-2 sentences)
}

Valid subCategories by category:
${JSON.stringify(VALID_SUBCATEGORIES, null, 2)}

IMPORTANT:
- Return ONLY a JSON object, no markdown, no explanation
- Keep user's form data unless the notes explicitly contradict it
- All values lowercase except itemName, brand, and aiNotes
- Be smart about inferring — "got it from Zara" means brand is Zara, "wear it to office" means occasion includes "office"`;

  const result = await withRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim();

  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const enhanced = JSON.parse(cleaned);

  if (!enhanced.category || !enhanced.attributes?.color) {
    throw new Error("Gemini returned incomplete data");
  }

  return enhanced;
}

// ── Get form options (for frontend dropdowns) ───────────────────────

function getFormOptions() {
  return {
    categories: VALID_CATEGORIES,
    subCategories: VALID_SUBCATEGORIES,
    styles: VALID_STYLES,
    occasions: VALID_OCCASIONS,
    seasons: VALID_SEASONS,
    weather: VALID_WEATHER,
    patterns: [
      "solid",
      "striped",
      "checkered",
      "plaid",
      "floral",
      "printed",
      "graphic",
      "abstract",
      "polka dot",
      "paisley",
      "camo",
    ],
    materials: [
      "cotton",
      "polyester",
      "linen",
      "silk",
      "denim",
      "wool",
      "leather",
      "synthetic",
      "chiffon",
      "satin",
      "velvet",
      "khadi",
      "georgette",
      "rayon",
      "nylon",
    ],
    fits: [
      "slim",
      "regular",
      "oversized",
      "relaxed",
      "skinny",
      "loose",
      "tailored",
    ],
    colors: [
      "black",
      "white",
      "grey",
      "gray",
      "beige",
      "cream",
      "ivory",
      "navy blue",
      "navy",
      "light blue",
      "sky blue",
      "blue",
      "dark blue",
      "denim blue",
      "teal",
      "red",
      "burgundy",
      "maroon",
      "rust",
      "coral",
      "green",
      "olive green",
      "olive",
      "emerald green",
      "emerald",
      "mint green",
      "sage",
      "yellow",
      "mustard",
      "gold",
      "pink",
      "baby pink",
      "pastel pink",
      "light pink",
      "hot pink",
      "purple",
      "lavender",
      "plum",
      "orange",
      "peach",
      "tangerine",
      "brown",
      "camel",
      "tan",
      "chocolate",
      "khaki",
      "silver",
      "charcoal",
      "off-white",
    ],
  };
}

module.exports = {
  imageSearch,
  analyzeClothingImage,
  analyzeClothingBuffer,
  parseClothingDetails,
  getFormOptions,
};
