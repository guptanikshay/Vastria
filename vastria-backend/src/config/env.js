require("dotenv").config();

if (!process.env.CLOUDINARY_API_KEY) {
  throw new Error("Missing Cloudinary config");
}
