const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
    },
    avatar: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: String,
    verificationExpires: Date,
    preferences: {
      style: {
        type: String,
        enum: ["casual", "formal", "streetwear"],
        default: "casual",
      },
    },
    // AI-learned preferences from chatbot conversations
    aiMemory: {
      favoriteColors: [String],
      favoriteStyles: [String],
      favoriteBrands: [String],
      bodyType: String,
      budget: String, // "low", "mid", "high", "luxury"
      notes: [String], // free-form learned facts, e.g. "prefers slim fit", "hates floral"
      lastUpdated: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
