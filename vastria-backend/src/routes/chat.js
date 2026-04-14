const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const chatController = require("../controllers/chatController");

// Chat sessions
router.post("/sessions", authMiddleware, chatController.createSession);
router.get("/sessions", authMiddleware, chatController.listSessions);
router.get("/sessions/:sessionId", authMiddleware, chatController.getSession);
router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  chatController.deleteSession,
);

// Send a message to a session
router.post(
  "/sessions/:sessionId/messages",
  authMiddleware,
  chatController.sendMessage,
);

module.exports = router;
