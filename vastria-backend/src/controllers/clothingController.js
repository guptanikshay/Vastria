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

const MAX_BATCH_IMAGES = 25;
const BATCH_ANALYSIS_CONCURRENCY = 4;

function buildClothingPayload(data, userId) {
  const attrs = data.attributes || {};

  return {
    user: userId,
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
  };
}

async function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "vastria" },
      (error, uploaded) => {
        if (error) return reject(error);
        resolve(uploaded);
      },
    );

    uploadStream.end(buffer);
  });
}

async function analyzeAndUploadFile(file) {
  const buffer = file.buffer;
  const mimeType = file.mimetype || "image/jpeg";

  const [cloudinaryResult, details] = await Promise.all([
    uploadBufferToCloudinary(buffer),
    analyzeClothingBuffer(buffer, mimeType),
  ]);

  return {
    imageUrl: cloudinaryResult.secure_url,
    publicId: cloudinaryResult.public_id,
    details,
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    const currentIndex = index;
    index += 1;

    if (currentIndex >= items.length) return;

    try {
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    } catch (error) {
      results[currentIndex] = { error };
    }

    await next();
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next(),
  );

  await Promise.all(runners);
  return results;
}

exports.createClothing = async (req, res) => {
  try {
    const newClothing = new Clothing(buildClothingPayload(req.body, req.user._id));

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

    const result = await uploadBufferToCloudinary(req.file.buffer);

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

    const { imageUrl, publicId, details } = await analyzeAndUploadFile(req.file);

    res.status(200).json({
      success: true,
      data: {
        imageUrl,
        publicId,
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

exports.scanClothingBatch = async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded" });
    }

    if (files.length > MAX_BATCH_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `You can upload up to ${MAX_BATCH_IMAGES} images at once`,
      });
    }

    const processed = await runWithConcurrency(
      files,
      BATCH_ANALYSIS_CONCURRENCY,
      async (file) => {
        const { imageUrl, details } = await analyzeAndUploadFile(file);
        return {
          fileName: file.originalname,
          payload: buildClothingPayload(
            {
              ...details,
              media: { imageUrl },
            },
            req.user._id,
          ),
        };
      },
    );

    const successfulItems = processed.filter((result) => result?.payload);
    const failures = processed
      .map((result, idx) => {
        if (!result?.error) return null;
        return {
          fileName: files[idx]?.originalname || `image-${idx + 1}`,
          message: result.error.message || "Failed to analyze image",
        };
      })
      .filter(Boolean);

    if (!successfulItems.length) {
      return res.status(500).json({
        success: false,
        message: "Failed to analyze uploaded images",
        data: { savedCount: 0, failures },
      });
    }

    const saveResults = await Promise.allSettled(
      successfulItems.map((item) => new Clothing(item.payload).save()),
    );
    const savedItems = saveResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const saveFailures = saveResults
      .map((result, idx) => {
        if (result.status === "fulfilled") return null;
        return {
          fileName: successfulItems[idx]?.fileName || `image-${idx + 1}`,
          message: result.reason?.message || "Failed to save item",
        };
      })
      .filter(Boolean);

    failures.push(...saveFailures);

    if (!savedItems.length) {
      return res.status(500).json({
        success: false,
        message: "Failed to save analyzed items",
        data: { savedCount: 0, failures },
      });
    }

    res.status(201).json({
      success: true,
      message:
        failures.length > 0
          ? `Added ${savedItems.length} items. ${failures.length} image(s) could not be processed.`
          : `Added ${savedItems.length} items to your wardrobe.`,
      data: {
        savedCount: savedItems.length,
        totalUploaded: files.length,
        items: savedItems,
        failures,
      },
    });
  } catch (error) {
    console.error("scanClothingBatch error", error);
    res.status(500).json({
      success: false,
      message: "Batch scan failed",
      error: error.message,
    });
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
