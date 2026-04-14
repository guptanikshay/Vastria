const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/signup", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleAuth);
router.post("/verify", authMiddleware, authController.verifyEmail);
router.post("/resend-code", authMiddleware, authController.resendCode);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
