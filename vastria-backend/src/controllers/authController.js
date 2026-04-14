const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { generateCode, sendVerificationEmail } = require("../config/email");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createToken(user) {
  const payload = { id: user._id, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, preferences } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const code = generateCode();
    const user = await User.create({
      name,
      email,
      password: hashed,
      preferences,
      isVerified: false,
      verificationCode: code,
      verificationExpires: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendVerificationEmail(email, code);

    const token = createToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: false,
        },
        token,
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error("Register error", error);
    res
      .status(500)
      .json({ success: false, message: "Server error registering user" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Please sign in with Google.",
      });
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      // Resend a fresh code
      const code = generateCode();
      user.verificationCode = code;
      user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();
      await sendVerificationEmail(user.email, code);

      const token = createToken(user);
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: false,
          },
          token,
          requiresVerification: true,
        },
      });
    }

    const token = createToken(user);

    res.status(200).json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email },
        token,
      },
    });
  } catch (error) {
    console.error("Login error", error);
    res
      .status(500)
      .json({ success: false, message: "Server error logging in" });
  }
};

exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.status(200).json({ success: true, data: req.user });
};

exports.verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Verification code is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Email already verified" });
    }

    if (user.verificationCode !== code) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });
    }

    if (user.verificationExpires < new Date()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Verification code has expired. Please request a new one.",
        });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: true,
        },
      },
    });
  } catch (error) {
    console.error("Verify email error", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

exports.resendCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Email already verified" });
    }

    const code = generateCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, code);

    res.status(200).json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Resend code error", error);
    res.status(500).json({ success: false, message: "Failed to resend code" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res
        .status(400)
        .json({ success: false, message: "Google credential is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google ID if user exists by email but hasn't used Google before
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        if (picture && !user.avatar) user.avatar = picture;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isVerified: true,
      });
    }

    const token = createToken(user);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Google auth error", error);
    res
      .status(500)
      .json({ success: false, message: "Google authentication failed" });
  }
};
