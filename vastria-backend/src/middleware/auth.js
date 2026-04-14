const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Missing auth token" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    req.user = user;

    // Allow verify & resend routes for unverified users
    const allowedPaths = [
      "/api/auth/verify",
      "/api/auth/resend-code",
      "/api/auth/me",
    ];
    if (
      !user.isVerified &&
      !user.googleId &&
      !allowedPaths.includes(req.originalUrl)
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Please verify your email first",
          requiresVerification: true,
        });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error", err);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

module.exports = authMiddleware;
