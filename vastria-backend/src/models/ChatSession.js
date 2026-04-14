const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    // Rich data attached to model responses (outfits, product links, etc.)
    attachments: [
      {
        type: {
          type: String,
          enum: ["outfit", "product", "wardrobe-item", "image"],
        },
        data: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
);

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    messages: [messageSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
