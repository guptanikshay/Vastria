const mongoose = require("mongoose");

const clothingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      index: true,
    },
    itemName: {
      type: String,
      // free text: "oversized graphic tee"
    },

    attributes: {
      color: {
        type: String,
        required: true,
        index: true,
      },
      secondaryColors: [String],
      pattern: String, // solid, striped, floral, etc.
      material: String, // cotton, denim, silk
      texture: String,
      fit: String, // slim, oversized, etc.
      length: String, // cropped, full, etc.
    },

    style: {
      type: [String],
      index: true,
      // casual, formal, streetwear, ethnic, etc.
    },
    occasion: [String], // party, office, wedding
    season: [String], // summer, winter
    weather: [String], // hot, cold, rainy

    brand: String,
    price: Number,
    currency: {
      type: String,
      default: "INR",
    },

    tags: {
      type: [String],
      index: true,
    },

    embedding: {
      type: [Number], // vector for similarity search
    },

    media: {
      imageUrl: String,
      gallery: [String],
    },

    relations: {
      similar: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Clothing",
        },
      ],
      pairedWith: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Clothing",
        },
      ],
    },

    usage: {
      favorite: { type: Boolean, default: false },
      wearCount: { type: Number, default: 0 },
      lastWorn: Date,
      rating: Number,
    },

    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      // ANY future data goes here without schema change
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Clothing", clothingSchema);
