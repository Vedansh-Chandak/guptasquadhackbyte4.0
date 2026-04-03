const Comment = require("../models/Comment.model");
const Hazard = require("../models/Hazard.model");
const {
  analyzeCommentForBlocklist,
  performLocalBlocklistCheck,
  performEnhancedBlocklistCheck,
} = require("../utils/armoriq-client");
const {
  keywordFirewallGuard,
  aiTrustGuard,
} = require("../middleware/armoriq.middleware");

// ─── ArmorIQ Comment Validation ────────────────────────────────────────────────
/**
 * Validate comment against ArmorIQ blocklist service
 * Calls external ArmorIQ API to check for blocked keywords
 * @param {string} commentText - The comment text
 * @returns {Promise<Object>} - { allowed, blocked_keywords, reason, confidence }
 */
const validateCommentWithArmorIQ = async (commentText) => {
  try {
    console.log(`🤖 Calling ArmorIQ service for comment validation...`);
    const armorIQResult = await analyzeCommentForBlocklist(commentText);

    return {
      allowed: armorIQResult.allowed,
      blocked_keywords: armorIQResult.blocked_keywords,
      reason: armorIQResult.reason,
      confidence: armorIQResult.confidence,
      trust_level: armorIQResult.allowed ? "HIGH" : "LOW",
      final_score: armorIQResult.confidence || (armorIQResult.allowed ? 0.9 : 0.1),
      fallback: armorIQResult.fallback || false
    };
  } catch (error) {
    console.error("❌ ArmorIQ comment validation failed:", error.message);
    // Fallback to enhanced local check
    const localResult = performEnhancedBlocklistCheck(commentText);
    return {
      allowed: localResult.allowed,
      blocked_keywords: localResult.blocked_keywords,
      reason: localResult.reason,
      confidence: 0.5,
      trust_level: localResult.allowed ? "MEDIUM" : "LOW",
      final_score: localResult.allowed ? 0.6 : 0.2,
      fallback: true
    };
  }
};

// ─── POST /hazards/:id/comments ───────────────────────────────────────────────
// addComment with ArmorIQ Policy Validation
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const hazardId = req.params.id;
    const userId = req.user._id;

    console.log(`\n📝 New comment from user: ${req.user.name} (ID: ${userId})`);
    console.log(`   Text length: ${text.length} chars`);

    // ── Step 1: Validate text format ──────────────────────────────
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required.",
      });
    }

    if (text.trim().length > 300) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 300 characters.",
      });
    }

    // ── Step 2: Verify hazard exists ──────────────────────────────
    const hazard = await Hazard.findById(hazardId);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: "Hazard not found.",
      });
    }

    // ── Step 3: ArmorIQ Blocklist Check ─────────────────────────────
    console.log(`🤖 Step 3: ArmorIQ-Enhanced Blocklist Validation`);
    console.log("-".repeat(80));

    const armorIQResult = await validateCommentWithArmorIQ(text);
    console.log(`  ✅ ArmorIQ-Enhanced Analysis Completed`);
    console.log(`    - Source: ${armorIQResult.source}`);
    console.log(`    - Allowed: ${armorIQResult.allowed}`);
    console.log(`    - Confidence: ${armorIQResult.confidence}`);
    if (armorIQResult.blocked_keywords.length > 0) {
      console.log(`    - Blocked Keywords: ${armorIQResult.blocked_keywords.join(', ')}`);
    }
    console.log(`    - Fallback Used: ${armorIQResult.fallback}`);

    // ── Step 4: Block if blocked keywords found ───────────────────
    if (!armorIQResult.allowed) {
      console.log(`❌ COMMENT BLOCKED: ${armorIQResult.reason}`);
      return res.status(403).json({
        success: false,
        message: "Comment contains blocked content",
        reason: armorIQResult.reason,
        blocked_keywords: armorIQResult.blocked_keywords,
        code: "COMMENT_BLOCKED",
      });
    }

    console.log(`✅ COMMENT ALLOWED: Passed ArmorIQ-enhanced validation\n`);

    // ── Step 5: Save comment to MongoDB ─────────────────────────────
    console.log(`💾 Step 5: Saving comment to MongoDB...`);
    const comment = await Comment.create({
      hazard_id: hazardId,
      user_id: userId,
      text: text.trim(),
    });

    // Populate user details
    await comment.populate("user_id", "name avatar_url is_official");

    console.log(`✅ Comment posted successfully (ID: ${comment._id})`);

    // Get updated comment count for this hazard
    const commentCount = await Comment.countDocuments({ hazard_id: hazardId });

    return res.status(201).json({
      success: true,
      message: "Comment posted successfully.",
      comment,
      counter: {
        comments: commentCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /hazards/:id/comments ────────────────────────────────────────────────
// getHazardComments — Returns all comments
const getHazardComments = async (req, res, next) => {
  try {
    const hazardId = req.params.id;
    const { limit = 20, page = 1 } = req.query;

    const hazard = await Hazard.findById(hazardId);
    if (!hazard) {
      return res.status(404).json({ success: false, message: "Hazard not found." });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Comment.countDocuments({
      hazard_id: hazardId,
    });

    const comments = await Comment.find({
      hazard_id: hazardId,
    })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user_id", "name avatar_url is_official");

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      comments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addComment, getHazardComments };
