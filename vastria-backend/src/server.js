require("./config/env");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const clothingRoutes = require("./routes/clothing");
const recommendationsRoutes = require("./routes/recommendations");
const chatRoutes = require("./routes/chat");
const outfitRoutes = require("./routes/outfits");
const app = express();

// Core middleware
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/clothing", clothingRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/outfits", outfitRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "Vastria API is running" });
});

// Global error handler (basic)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
