const ChatSession = require("../models/ChatSession");
const { chat } = require("../services/chatbotService");

// ── Start a new chat session ────────────────────────────────────────

exports.createSession = async (req, res) => {
  try {
    const session = await ChatSession.create({
      user: req.user._id,
      title: req.body?.title || "New Chat",
    });

    res.status(201).json({ success: true, data: { sessionId: session._id } });
  } catch (error) {
    console.error("createSession error", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat session",
      error: error.message,
    });
  }
};

// ── List chat sessions for user ─────────────────────────────────────

exports.listSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ user: req.user._id })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("listSessions error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to list sessions" });
  }
};

// ── Get a session with its messages ─────────────────────────────────

exports.getSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id,
    }).lean();

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("getSession error", error);
    res.status(500).json({ success: false, message: "Failed to get session" });
  }
};

// ── Send a message ──────────────────────────────────────────────────

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id,
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Build Gemini history from stored messages (only user/model text parts)
    const geminiHistory = session.messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // Call chatbot service
    const { text, attachments } = await chat(
      req.user._id,
      geminiHistory,
      message.trim(),
    );

    // Auto-generate session title from the first user message
    if (session.messages.length === 0) {
      session.title =
        message.trim().length > 50
          ? message.trim().substring(0, 50) + "..."
          : message.trim();
    }

    // Save user message + model response
    session.messages.push({ role: "user", text: message.trim() });
    session.messages.push({ role: "model", text, attachments });
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        reply: text,
        attachments,
      },
    });
  } catch (error) {
    console.error("sendMessage error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process message",
      error: error.message,
    });
  }
};

// ── Delete a session ────────────────────────────────────────────────

exports.deleteSession = async (req, res) => {
  try {
    const result = await ChatSession.findOneAndDelete({
      _id: req.params.sessionId,
      user: req.user._id,
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("deleteSession error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete session" });
  }
};
