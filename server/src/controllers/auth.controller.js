const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User.model");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helper: Generate JWT ─────────────────────────────────────────────────────
const generateToken = (userId, expiresIn = process.env.JWT_EXPIRES_IN || "7d") => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

// ─── Helper: Send Auth Response ───────────────────────────────────────────────
const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);
  user.last_login = new Date();
  user.save({ validateBeforeSave: false });

  return res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicProfile(),
  });
};

// ─── POST /auth/register ──────────────────────────────────────────────────────
const registerWithEmail = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name,
      email,
      phone: phone || null,
      auth_method: "email",
      password_hash: password, // Pre-save hook hashes this
    });

    return sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────
const loginWithEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Check for hardcoded official credentials first
    if (email === process.env.OFFICIAL_USERNAME && password === process.env.OFFICIAL_PASSWORD) {
      // Create or find official user
      let officialUser = await User.findOne({ email: email.toLowerCase() });
      if (!officialUser) {
        officialUser = await User.create({
          name: "RoadRash Official",
          email: email.toLowerCase(),
          is_official: true,
          auth_method: "email",
          is_verified: true,
        });
      }
      return sendAuthResponse(res, officialUser);
    }

    // Regular user auth via DB
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password_hash"
    );

    if (!user || user.auth_method !== "email") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/google (register + login combined) ────────────────────────────
const googleAuth = async (req, res, next) => {
  try {
    const { id_token } = req.body;

    if (!id_token) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required.",
      });
    }

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ google_id }, { email }] });

    if (user) {
      // Existing user — update google_id if missing
      if (!user.google_id) {
        user.google_id = google_id;
        user.auth_method = "google";
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // New user
      user = await User.create({
        name,
        email,
        google_id,
        avatar_url: picture || null,
        auth_method: "google",
        is_verified: true, // Google accounts are pre-verified
      });
    }

    return sendAuthResponse(res, user, user.isNew ? 201 : 200);
  } catch (error) {
    if (error.message?.includes("Token used too late")) {
      return res.status(401).json({ success: false, message: "Google token expired." });
    }
    next(error);
  }
};

// ─── POST /auth/official ──────────────────────────────────────────────────────
const officialAuth = async (req, res, next) => {
  try {
    const { username, password, department } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    // Check against env credentials
    if (
      username !== process.env.OFFICIAL_USERNAME ||
      password !== process.env.OFFICIAL_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid official credentials.",
      });
    }

    // Generate a special official JWT signed with a separate secret
    const officialToken = jwt.sign(
      {
        username,
        department: department || "General",
        is_official: true,
        role: "official",
      },
      process.env.OFFICIAL_JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      success: true,
      token: officialToken,
      official: {
        username,
        department: department || "General",
        is_official: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerWithEmail,
  loginWithEmail,
  googleAuth,
  officialAuth,
};
