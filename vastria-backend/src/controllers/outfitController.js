const Outfit = require("../models/Outfit");
const Clothing = require("../models/Clothing");
const { generateOutfits } = require("../services/outfitGenerator");

// Generate outfits and save them to DB (replaces old ones)
exports.generateAndSave = async (req, res) => {
  try {
    const { minScore = 50, maxPerCategory = 50 } = req.body;

    const clothes = await Clothing.find({ user: req.user._id });
    if (!clothes.length) {
      return res
        .status(400)
        .json({ success: false, message: "Add items to wardrobe first" });
    }

    const result = generateOutfits(clothes, { minScore, maxPerCategory });
    const outfitsData = result.outfits || result || [];

    // Remove old non-favourite outfits, keep favourites
    await Outfit.deleteMany({ user: req.user._id, favourite: false });

    // Save new outfits
    const docs = await Outfit.insertMany(
      outfitsData.map((o) => ({
        user: req.user._id,
        top: o.top || [],
        bottom: o.bottom || null,
        footwear: o.footwear || null,
        accessories: o.accessories || [],
        score: o.score || 0,
        category: o.category || "Casual",
      })),
    );

    res.status(200).json({ success: true, data: docs });
  } catch (error) {
    console.error("generateAndSave error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate outfits" });
  }
};

// Get saved outfits for user
exports.getSavedOutfits = async (req, res) => {
  try {
    const outfits = await Outfit.find({ user: req.user._id }).sort({
      score: -1,
    });
    res.status(200).json({ success: true, data: outfits });
  } catch (error) {
    console.error("getSavedOutfits error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch outfits" });
  }
};

// Toggle favourite on an outfit
exports.toggleFavourite = async (req, res) => {
  try {
    const outfit = await Outfit.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!outfit) {
      return res
        .status(404)
        .json({ success: false, message: "Outfit not found" });
    }

    outfit.favourite = !outfit.favourite;
    await outfit.save();

    res.status(200).json({ success: true, data: outfit });
  } catch (error) {
    console.error("toggleFavourite error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to toggle favourite" });
  }
};

// Get favourite outfits only
exports.getFavourites = async (req, res) => {
  try {
    const outfits = await Outfit.find({
      user: req.user._id,
      favourite: true,
    }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: outfits });
  } catch (error) {
    console.error("getFavourites error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch favourites" });
  }
};
