const mongoose = require("mongoose");

const outfitPieceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: String,
    category: String,
    subCategory: String,
  },
  { _id: false },
);

const outfitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    top: [outfitPieceSchema],
    bottom: outfitPieceSchema,
    footwear: outfitPieceSchema,
    accessories: [outfitPieceSchema],
    score: { type: Number, default: 0 },
    category: { type: String, default: "Casual" },
    favourite: { type: Boolean, default: false },
  },
  { timestamps: true },
);

outfitSchema.index({ user: 1, favourite: 1 });

module.exports = mongoose.model("Outfit", outfitSchema);
