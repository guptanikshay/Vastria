const Clothing = require("../models/Clothing");
const cloudinary = require("../config/cloudinary");
const { generateOutfits } = require("../services/outfitGenerator");
const {
  imageSearch,
  analyzeClothingImage,
  analyzeClothingBuffer,
  parseClothingDetails,
  getFormOptions,
} = require("../services/aiClothingService");

exports.createClothing = async (req, res) => {
  try {
    const data = req.body;
    const attrs = data.attributes || {};

    const newClothing = new Clothing({
      user: req.user._id,
      category: data.category,
      subCategory: data.subCategory,
      itemName: data.itemName,
      attributes: {
        color: attrs.color || data.color,
        secondaryColors: attrs.secondaryColors || data.secondaryColors || [],
        pattern: attrs.pattern || data.pattern,
        material: attrs.material || data.material,
        texture: attrs.texture || data.texture,
        fit: attrs.fit || data.fit,
        length: attrs.length || data.length,
      },
      style: data.style || [],
      occasion: data.occasion || [],
      season: data.season || [],
      weather: data.weather || [],
      brand: data.brand,
      price: data.price,
      currency: data.currency || "INR",
      tags: data.tags || [],
      metadata: data.metadata || {},
      media: {
        imageUrl: data.media?.imageUrl || data.imageUrl,
        gallery: data.media?.gallery || data.gallery || [],
      },
    });

    const saved = await newClothing.save();

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error("createClothing error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create clothing item" });
  }
};

exports.getClothing = async (req, res) => {
  try {
    const clothes = await Clothing.find({ user: req.user._id });
    res.status(200).json({ success: true, data: clothes });
  } catch (error) {
    console.error("getClothing error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch clothing" });
  }
};

exports.deleteClothing = async (req, res) => {
  try {
    const item = await Clothing.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }
    res.status(200).json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("deleteClothing error", error);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "vastria" },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        },
      );

      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      success: true,
      data: { imageUrl: result.secure_url, publicId: result.public_id },
    });
  } catch (error) {
    console.error("uploadImage error", error);
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
};

exports.scanClothing = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype || "image/jpeg";

    // Upload to Cloudinary and analyze with Gemini Vision in parallel
    const [cloudinaryResult, details] = await Promise.all([
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "vastria" },
          (error, uploaded) => {
            if (error) return reject(error);
            resolve(uploaded);
          },
        );
        uploadStream.end(buffer);
      }),
      analyzeClothingBuffer(buffer, mimeType),
    ]);

    res.status(200).json({
      success: true,
      data: {
        imageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        details,
      },
    });
  } catch (error) {
    console.error("scanClothing error", error);
    res
      .status(500)
      .json({ success: false, message: "Scan failed", error: error.message });
  }
};

exports.generateOutfitsEndpoint = async (req, res) => {
  try {
    const { minScore = 50, maxPerCategory = 50 } = req.body;

    // Fetch all clothing for user
    const clothes = await Clothing.find({ user: req.user._id });

    if (!clothes.length) {
      return res.status(400).json({
        success: false,
        message: "Add items to wardrobe first",
      });
    }

    // Generate outfits with v2 engine
    const result = generateOutfits(clothes, { minScore, maxPerCategory });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("generateOutfits error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate outfits" });
  }
};

// ── AI-powered endpoints ────────────────────────────────────────────

exports.searchItem = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const images = await imageSearch(query.trim());

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error("searchItem error", error);
    res.status(500).json({
      success: false,
      message: "Failed to search for clothing images",
    });
  }
};

exports.analyzeImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "imageUrl is required",
      });
    }

    const details = await analyzeClothingImage(imageUrl);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("analyzeImage error", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze clothing image",
    });
  }
};

exports.parseDetails = async (req, res) => {
  try {
    const { formData, notes } = req.body;

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({
        success: false,
        message: "formData object is required",
      });
    }

    if (!notes || typeof notes !== "string" || notes.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "notes must be at least 3 characters",
      });
    }

    const enhanced = await parseClothingDetails(formData, notes.trim());

    res.status(200).json({
      success: true,
      data: enhanced,
    });
  } catch (error) {
    console.error("parseDetails error", error);
    res.status(500).json({
      success: false,
      message: "Failed to parse clothing details",
    });
  }
};

exports.formOptions = (req, res) => {
  res.status(200).json({
    success: true,
    data: getFormOptions(),
  });
};
