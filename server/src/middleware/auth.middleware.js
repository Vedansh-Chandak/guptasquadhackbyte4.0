const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

// ─── requireAuth ──────────────────────────────────────────────────────────────
// Validates JWT, attaches user to req.user
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Try official token first
    if (token) {
      try {
        const officialDecoded = jwt.verify(
          token,
          process.env.OFFICIAL_JWT_SECRET
        );
        if (officialDecoded.is_official) {
          req.user = officialDecoded;
          req.isOfficial = true;
          return next();
        }
      } catch (_) {
        // Not an official token — continue with regular JWT
      }
    }

    // Regular user JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password_hash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
    }

    req.user = user;
    req.isOfficial = false;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired." });
    }
    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token." });
    }
    next(error);
  }
};

// ─── requireOfficial ───
// Only allows officials through — must come AFTER requireAuth
const requireOfficial = (req, res, next) => {
  if (!req.isOfficial && !req.user?.is_official) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to official accounts only.",
    });
  }
  next();
};

module.exports = { requireAuth, requireOfficial };
