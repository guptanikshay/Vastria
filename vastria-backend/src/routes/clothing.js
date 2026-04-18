const express = require("express");
const multer = require("multer");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const clothingController = require("../controllers/clothingController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Get all items for authenticated user
router.get("/", authMiddleware, clothingController.getClothing);

// Add a new item (client can pass imageUrl directly or after upload)
router.post("/", authMiddleware, clothingController.createClothing);

// Upload an image to Cloudinary and return secure URL
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("image"),
  clothingController.uploadImage,
);

// Scan: upload image + AI analysis in one step
router.post(
  "/scan",
  authMiddleware,
  upload.single("image"),
  clothingController.scanClothing,
);

// Batch scan: upload multiple images, analyze, and save items directly
router.post(
  "/scan-batch",
  authMiddleware,
  upload.array("images", 25),
  clothingController.scanClothingBatch,
);

// Generate outfit combinations
router.post(
  "/generate-outfits",
  authMiddleware,
  clothingController.generateOutfitsEndpoint,
);

// AI: Search for clothing images from the web
router.post("/search", authMiddleware, clothingController.searchItem);

// AI: Analyze a clothing image with Gemini Vision
router.post("/analyze-image", authMiddleware, clothingController.analyzeImage);

// AI: Parse free-text notes to enhance clothing attributes
router.post("/parse-details", authMiddleware, clothingController.parseDetails);

// Delete a clothing item
router.delete("/:id", authMiddleware, clothingController.deleteClothing);

// Get valid form options for dropdowns (no auth needed)
router.get("/form-options", clothingController.formOptions);

module.exports = router;
