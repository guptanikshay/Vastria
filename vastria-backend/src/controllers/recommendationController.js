const Clothing = require("../models/Clothing");
const { recommendOutfits } = require("../services/recommendationService");
const { analyzeWardrobe } = require("../services/wardrobeAnalysis");

exports.getRecommendations = async (req, res) => {
  try {
    const { occasion, weather, season, minScore } = req.query;

    // Fetch all clothing for user
    const clothes = await Clothing.find({ user: req.user._id });

    if (!clothes.length) {
      return res.status(400).json({
        success: false,
        message: "Add items to wardrobe first",
      });
    }

    // Get recommendations
    const filters = {
      occasion: occasion || undefined,
      weather: weather || undefined,
      season: season || undefined,
      minScore: minScore ? parseInt(minScore) : 55,
    };

    const result = recommendOutfits(clothes, req.user, filters);

    res.status(200).json({
      success: true,
      data: {
        outfits: result.recommendations,
        filters: result.filters,
        summary: result.summary,
      },
    });
  } catch (error) {
    console.error("getRecommendations error", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate recommendations",
    });
  }
};

// ── AI Wardrobe Analysis ────────────────────────────────────────────

exports.getWardrobeAnalysis = async (req, res) => {
  try {
    const clothes = await Clothing.find({ user: req.user._id }).lean();

    const analysis = await analyzeWardrobe(clothes, req.user);

    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    console.error("getWardrobeAnalysis error", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze wardrobe",
      error: error.message,
    });
  }
};
