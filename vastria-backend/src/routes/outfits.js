const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const outfitController = require("../controllers/outfitController");

// Get saved outfits
router.get("/", authMiddleware, outfitController.getSavedOutfits);

// Generate new outfits and save
router.post("/generate", authMiddleware, outfitController.generateAndSave);

// Get favourites only
router.get("/favourites", authMiddleware, outfitController.getFavourites);

// Toggle favourite
router.patch(
  "/:id/favourite",
  authMiddleware,
  outfitController.toggleFavourite,
);

module.exports = router;
