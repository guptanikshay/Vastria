/**
 * Chatbot Service
 *
 * Gemini-powered conversational assistant with function calling.
 * Tools: search_web, query_wardrobe, generate_outfit, analyze_image
 */

const { genAI, withRetry } = require("../config/gemini");
const Clothing = require("../models/Clothing");
const User = require("../models/User");
const { generateOutfits } = require("./outfitGenerator");
const { analyzeClothingImage } = require("./aiClothingService");

// ── Tool declarations for Gemini function calling ───────────────────

const tools = [
  {
    functionDeclarations: [
      {
        name: "search_web",
        description:
          "Search Google Shopping for clothing items to buy. Returns real product listings with prices, store names, buy links, and thumbnails. Use when the user asks to find, buy, or shop for new clothing items.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                'Shopping search query for clothing, e.g. "navy blue slim fit blazer men". Be specific with color, fit, item type, and gender.',
            },
          },
          required: ["query"],
        },
      },
      {
        name: "query_wardrobe",
        description:
          "Query the user's wardrobe. Returns clothing items the user already owns. Use when the user asks about their existing clothes or wants to pair something with what they have.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Filter by category: topwear, bottomwear, footwear, accessories, fullbody. Optional.",
            },
            color: {
              type: "string",
              description: "Filter by color. Optional.",
            },
            style: {
              type: "string",
              description:
                "Filter by style: casual, formal, streetwear, ethnic, etc. Optional.",
            },
            occasion: {
              type: "string",
              description:
                "Filter by occasion: casual, formal, party, wedding, office, date, etc. Optional.",
            },
          },
        },
      },
      {
        name: "generate_outfit",
        description:
          "Generate outfit combinations from the user's wardrobe using the outfit engine. Use when the user wants outfit suggestions from their existing clothes. Optionally filter by minimum score.",
        parameters: {
          type: "object",
          properties: {
            minScore: {
              type: "number",
              description:
                "Minimum outfit score (0-100). Default 50. Use higher (70+) for formal/date occasions.",
            },
            maxResults: {
              type: "number",
              description: "Maximum outfits to return. Default 10.",
            },
          },
        },
      },
      {
        name: "analyze_image",
        description:
          "Analyze a clothing image URL using AI vision to extract details like color, material, style, etc. Use when the user shares an image URL or when you found a product image from search.",
        parameters: {
          type: "object",
          properties: {
            imageUrl: {
              type: "string",
              description: "URL of the clothing image to analyze.",
            },
          },
          required: ["imageUrl"],
        },
      },
      {
        name: "save_user_preference",
        description:
          "Save a learned preference about the user for future conversations. Use when the user tells you something personal about their style, body type, favorite brands, budget, or dislikes.",
        parameters: {
          type: "object",
          properties: {
            preferenceType: {
              type: "string",
              enum: [
                "favoriteColor",
                "favoriteStyle",
                "favoriteBrand",
                "bodyType",
                "budget",
                "note",
              ],
              description: "Type of preference to save.",
            },
            value: {
              type: "string",
              description:
                'The value to save, e.g. "navy blue", "slim fit preference", "Zara"',
            },
          },
          required: ["preferenceType", "value"],
        },
      },
    ],
  },
];

// ── Tool execution ──────────────────────────────────────────────────

async function executeTool(name, args, userId) {
  switch (name) {
    case "search_web": {
      const apiKey = process.env.SERP_API_KEY;
      if (!apiKey) return { error: "Shopping search not configured" };

      const params = new URLSearchParams({
        q: args.query,
        engine: "google_shopping",
        api_key: apiKey,
        gl: "in",
        hl: "en",
        num: 8,
      });

      try {
        const resp = await fetch(`https://serpapi.com/search.json?${params}`);
        if (!resp.ok) return [];
        const data = await resp.json();

        return (data.shopping_results || []).slice(0, 8).map((item) => ({
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

    case "query_wardrobe": {
      const filter = { user: userId };
      if (args.category) filter.category = args.category;
      if (args.color) filter["attributes.color"] = new RegExp(args.color, "i");
      if (args.style) filter.style = args.style;
      if (args.occasion) filter.occasion = args.occasion;

      const items = await Clothing.find(filter).lean();
      return items.map((item) => ({
        id: item._id,
        itemName: item.itemName,
        category: item.category,
        subCategory: item.subCategory,
        color: item.attributes?.color,
        material: item.attributes?.material,
        fit: item.attributes?.fit,
        style: item.style,
        occasion: item.occasion,
        brand: item.brand,
        imageUrl: item.media?.imageUrl,
      }));
    }

    case "generate_outfit": {
      const clothes = await Clothing.find({ user: userId }).lean();
      if (!clothes.length) return { error: "Wardrobe is empty" };

      const { outfits } = generateOutfits(clothes, {
        minScore: args.minScore || 50,
        maxPerCategory: args.maxResults || 10,
      });

      return outfits.map((o) => ({
        score: o.score,
        layered: o.layered,
        top: o.top.map((t) => ({
          name: t.name,
          color: t.color,
          subCategory: t.subCategory,
        })),
        bottom: o.fullbody
          ? undefined
          : {
              name: o.bottom?.name,
              color: o.bottom?.color,
              subCategory: o.bottom?.subCategory,
            },
        footwear: {
          name: o.footwear?.name,
          color: o.footwear?.color,
          subCategory: o.footwear?.subCategory,
        },
        accessories: (o.accessories || []).map((a) => ({
          name: a.name,
          subCategory: a.subCategory,
        })),
      }));
    }

    case "analyze_image": {
      return await analyzeClothingImage(args.imageUrl);
    }

    case "save_user_preference": {
      const update = {};
      const now = new Date();

      switch (args.preferenceType) {
        case "favoriteColor":
          update.$addToSet = { "aiMemory.favoriteColors": args.value };
          break;
        case "favoriteStyle":
          update.$addToSet = { "aiMemory.favoriteStyles": args.value };
          break;
        case "favoriteBrand":
          update.$addToSet = { "aiMemory.favoriteBrands": args.value };
          break;
        case "bodyType":
          update.$set = { "aiMemory.bodyType": args.value };
          break;
        case "budget":
          update.$set = { "aiMemory.budget": args.value };
          break;
        case "note":
          update.$addToSet = { "aiMemory.notes": args.value };
          break;
      }

      update.$set = { ...update.$set, "aiMemory.lastUpdated": now };
      await User.findByIdAndUpdate(userId, update);
      return { saved: true, type: args.preferenceType, value: args.value };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Build system prompt ─────────────────────────────────────────────

function buildSystemPrompt(user, wardrobeSummary) {
  const memory = user.aiMemory || {};
  const prefParts = [];

  if (memory.favoriteColors?.length)
    prefParts.push(`Favorite colors: ${memory.favoriteColors.join(", ")}`);
  if (memory.favoriteStyles?.length)
    prefParts.push(`Favorite styles: ${memory.favoriteStyles.join(", ")}`);
  if (memory.favoriteBrands?.length)
    prefParts.push(`Favorite brands: ${memory.favoriteBrands.join(", ")}`);
  if (memory.bodyType) prefParts.push(`Body type: ${memory.bodyType}`);
  if (memory.budget) prefParts.push(`Budget: ${memory.budget}`);
  if (memory.notes?.length)
    prefParts.push(`Other notes: ${memory.notes.join("; ")}`);

  return `You are Vastria, a personal AI fashion assistant. You help users manage their wardrobe, create outfits, and find new clothing items.

USER: ${user.name}
${prefParts.length ? "\nUSER PREFERENCES (learned from past conversations):\n" + prefParts.join("\n") : ""}

WARDROBE SUMMARY:
${wardrobeSummary}

YOUR CAPABILITIES:
- Search the web for new clothing items (use search_web)
- Browse the user's wardrobe (use query_wardrobe)
- Generate outfit combinations from their wardrobe (use generate_outfit)
- Analyze clothing images (use analyze_image)
- Remember user preferences for future sessions (use save_user_preference)

RESPONSE GUIDELINES:
- Be conversational, friendly, and fashion-aware
- When recommending products from search_web results, ALWAYS include:
  * The product name
  * The price
  * The store name
  * The exact productLink URL from the search results as a clickable "Buy Now" link
- Format product links as: [Buy Now on StoreName](productLink)
- NEVER make up or hallucinate product links — only use the exact productLink URLs returned by search_web
- When suggesting outfits from the wardrobe, describe each piece clearly
- When the user reveals a preference (color, style, brand, budget, body type), SAVE it using save_user_preference
- If a user wants to add a web product to their wardrobe, tell them you've prepared the details and include the structured clothing data in your response
- Keep responses concise but helpful — don't write essays
- Use outfit scores to indicate how well pieces go together`;
}

function buildWardrobeSummary(items) {
  if (!items.length) return "Wardrobe is empty.";

  const byCat = {};
  const colors = new Set();
  const styles = new Set();

  for (const item of items) {
    byCat[item.category] = (byCat[item.category] || 0) + 1;
    if (item.attributes?.color) colors.add(item.attributes.color);
    if (item.style) item.style.forEach((s) => styles.add(s));
  }

  const lines = [
    `Total items: ${items.length}`,
    `Categories: ${Object.entries(byCat)
      .map(([k, v]) => `${k}(${v})`)
      .join(", ")}`,
    `Colors in wardrobe: ${[...colors].join(", ")}`,
    `Styles: ${[...styles].join(", ")}`,
  ];

  return lines.join("\n");
}

// ── Main chat function ──────────────────────────────────────────────

/**
 * Process a user message in a chat session.
 * Handles multi-turn conversation with function calling.
 *
 * @param {string} userId - User's MongoDB ID
 * @param {Array} history - Previous messages [{role, parts}] in Gemini format
 * @param {string} userMessage - The new user message
 * @returns {Object} - { text, attachments, updatedHistory }
 */
async function chat(userId, history, userMessage) {
  // Load user + wardrobe for system prompt
  const [user, wardrobeItems] = await Promise.all([
    User.findById(userId).lean(),
    Clothing.find({ user: userId }).lean(),
  ]);

  const systemPrompt = buildSystemPrompt(
    user,
    buildWardrobeSummary(wardrobeItems),
  );

  const chatModel = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    tools,
    systemInstruction: systemPrompt,
  });

  const chatSession = chatModel.startChat({ history });

  let result = await withRetry(() => chatSession.sendMessage(userMessage));
  let response = result.response;

  const attachments = [];

  // Handle function calls — loop until the model is done calling tools
  let maxIterations = 5;
  while (maxIterations-- > 0) {
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (!functionCalls.length) break;

    // Execute all function calls
    const functionResponses = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const toolResult = await executeTool(name, args, userId);

      // Collect attachments for the frontend
      if (name === "search_web") {
        attachments.push(
          ...toolResult.map((r) => ({
            type: "product",
            data: r,
          })),
        );
      } else if (name === "generate_outfit") {
        if (Array.isArray(toolResult)) {
          attachments.push(
            ...toolResult.map((o) => ({
              type: "outfit",
              data: o,
            })),
          );
        }
      } else if (name === "analyze_image") {
        attachments.push({ type: "wardrobe-item", data: toolResult });
      }

      functionResponses.push({
        functionResponse: {
          name,
          response: { result: toolResult },
        },
      });
    }

    // Send function results back to Gemini
    result = await withRetry(() => chatSession.sendMessage(functionResponses));
    response = result.response;
  }

  // Extract the final text response
  const text =
    response.candidates?.[0]?.content?.parts
      ?.filter((p) => p.text)
      .map((p) => p.text)
      .join("\n") || "I couldn't generate a response. Please try again.";

  // Get the full updated history from the chat session
  const updatedHistory = await chatSession.getHistory();

  return { text, attachments, updatedHistory };
}

module.exports = { chat, buildWardrobeSummary };
