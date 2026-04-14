const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const recommendationController = require("../controllers/recommendationController");

// Get outfit recommendations based on filters
router.get("/", authMiddleware, recommendationController.getRecommendations);

// AI-powered wardrobe analysis and suggestions
router.get(
  "/wardrobe-analysis",
  authMiddleware,
  recommendationController.getWardrobeAnalysis,
);

module.exports = router;
