const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    await mongoose.connect(mongoUri); // ✅ removed old options
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error; // lets server.js handle the failure
  }
}

module.exports = connectDB;
