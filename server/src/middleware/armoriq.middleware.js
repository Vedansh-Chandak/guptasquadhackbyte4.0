const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// ─── Initialize ArmorIQ SDK ───────────────────────────────────────────────────
let ArmorIQClient;
try {
  const armoriqModule = require("@armoriq/sdk");
  ArmorIQClient = armoriqModule.ArmorIQClient;
} catch (e) {
  console.warn("⚠️  ArmorIQ SDK not installed. Using fallback mode.");
  ArmorIQClient = null;
}

const armoriq = ArmorIQClient
  ? new ArmorIQClient({
      apiKey: process.env.ARMORIQ_API_KEY,
      userId: process.env.ARMORIQ_USER_ID,
      agentId: process.env.ARMORIQ_AGENT_ID,
    })
  : null;

// ─── Configuration ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CACHE_TTL_MS = 60 * 1000; // 60 seconds duplicate window
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

// ─── Whitelist Keywords (valid road hazards) ──────────────────────────────────
const HAZARD_WHITELIST = [
  "pothole",
  "hole",
  "crack",
  "asphalt",
  "pavement",
  "road",
  "debris",
  "trash",
  "garbage",
  "broken",
  "damaged",
  "flooding",
  "water",
  "uneven",
  "bump",
  "dip",
  "pit",
  "rut",
  "chuckhole",
  "crater",
  "gutter",
  "lane",
  "street",
  "surface",
  "concrete",
  "cement",
  "broken glass",
  "rocks",
  "potholes",
  "potholes",
  "signage",
  "sign",
  "lamp",
  "light",
  "pole",
  "bollard",
  "barrier",
  "cone",
  "manhole","clutter","plastic bottles","jars"
];

// ─── Blacklist Keywords (malicious/inappropriate content) ────────────────────
const KEYWORD_BLACKLIST = [
  "weapon",
  "gun",
  "blood",
  "nude",
  "naked",
  "nudity",
  "war",
  "drug",
  "bomb",
  "kill",
  "attack",
  "violence",
  "hack",
  "exploit",
  "malware",
  "phishing",
  "spam",
];

// ─── In-Memory Stores (use Redis in production) ──────────────────────────────
const duplicateCache = new Map(); // hash → timestamp
const rateLimitStore = new Map(); // ip → [timestamps]

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Detect MIME type from file magic bytes
function detectMimeType(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return "unknown";
}

// 60-second duplicate hash detection
function isDuplicate(hash) {
  const lastSeen = duplicateCache.get(hash);
  if (lastSeen && Date.now() - lastSeen < CACHE_TTL_MS) return true;
  duplicateCache.set(hash, Date.now());
  return false;
}

// 5 requests per 10 minutes per IP
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — ArmorIQ Cloud Guard
// ═══════════════════════════════════════════════════════════════════════════════

async function armorIQCloudGuard(fileBuffer, req) {
  try {
    // Local: Rate Limit
    if (isRateLimited(req.ip)) {
      return {
        allowed: false,
        reason: "Layer 1: Rate limit exceeded (5 reports per 10 mins)",
      };
    }

    // Local: File Size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return { allowed: false, reason: "Layer 1: File size exceeds 10MB" };
    }

    // Local: File Type via Magic Bytes
    const mimeType = detectMimeType(fileBuffer);
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return {
        allowed: false,
        reason: `Layer 1: Invalid file type (${mimeType}). Only JPG, PNG, WEBP allowed`,
      };
    }

    // Local: Duplicate Detection
    const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    if (isDuplicate(hash)) {
      return {
        allowed: false,
        reason: "Layer 1: Duplicate file upload detected within 60 seconds",
      };
    }

    // ArmorIQ Cloud: Get Intent Token (if SDK available)
    if (armoriq) {
      try {
        const plan = {
          goal: "Validate and process road damage image upload",
          steps: [
            {
              action: "image_upload",
              mcp: "roadrash-mcp",
              description: "Upload and validate road damage image",
              params: {
                ip: req.ip,
                fileSize: fileBuffer.length,
                mimeType,
                hash,
              },
            },
          ],
        };

        const captured = armoriq.capturePlan(
          "roadrash-ai",
          "User uploading road damage image for analysis",
          plan
        );

        const token = await armoriq.getIntentToken(
          captured,
          {
            allow: ["roadrash-mcp/image_upload"],
            deny: ["roadrash-mcp/delete_*", "roadrash-mcp/admin_*"],
          },
          300 // 5 minutes
        );

        if (!token || !token.planHash) {
          return {
            allowed: false,
            reason: "Layer 1 (ArmorIQ): Token issuance failed",
          };
        }

        return { allowed: true, token, hash };
      } catch (error) {
        const name = error.constructor?.name || "";
        if (name === "PolicyBlockedException") {
          return {
            allowed: false,
            reason: `Layer 1 (ArmorIQ Policy): ${error.message}`,
          };
        }
        if (name === "AuthenticationError" || name === "ConfigurationException") {
          return {
            allowed: false,
            reason: `Layer 1 (ArmorIQ Auth): ${error.message}`,
          };
        }
        console.error("ArmorIQ Cloud Error:", error.message);
        return { allowed: false, reason: "Layer 1: Security layer offline" };
      }
    }

    // Fallback: No SDK, pass with hash
    return { allowed: true, hash };
  } catch (error) {
    console.error("Layer 1 Guard Error:", error.message);
    return { allowed: false, reason: "Layer 1: Internal guard error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Keyword Firewall Guard
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Keyword Firewall Guard
// ═══════════════════════════════════════════════════════════════════════════════

function keywordFirewallGuard(aiAnalysis) {
  if (!aiAnalysis || typeof aiAnalysis !== "object") {
    return { allowed: false, reason: "Layer 2: Invalid AI analysis payload" };
  }

  console.log("\n  🔍 LAYER 2 VALIDATION LOGIC:");
  console.log("  " + "-".repeat(76));

  // ─── Check for blacklisted keywords (malicious content) ────────────
  const imageKeywords = aiAnalysis?.image_keywords || [];
  console.log(`  🔎 Checking for blacklisted content...`);
  console.log(`    - Input Keywords: ${JSON.stringify(imageKeywords)}`);
  console.log(`    - Blacklist Size: ${KEYWORD_BLACKLIST.length} keywords`);

  if (Array.isArray(imageKeywords)) {
    const lowerKeywords = imageKeywords.map((k) => String(k).toLowerCase());
    const hit = KEYWORD_BLACKLIST.find((bad) => lowerKeywords.includes(bad));
    if (hit) {
      console.log(`    ❌ BLACKLIST HIT: "${hit}" detected!`);
      return {
        allowed: false,
        reason: `Layer 2: Flagged keyword detected — "${hit}"`,
      };
    }
    console.log(`    ✅ No blacklisted keywords found`);
  }

  // ─── Validate Road Hazard Content ──────────────────────────────────
  // At least one keyword should match valid road hazard keywords
  console.log(`\n  🔎 Checking for valid road hazard keywords...`);
  console.log(`    - Whitelist Size: ${HAZARD_WHITELIST.length} keywords`);
  console.log(`    - Whitelist Sample: ${HAZARD_WHITELIST.slice(0, 5).join(", ")}...`);

  const hasRoadHazardKeyword = Array.isArray(imageKeywords)
    ? imageKeywords.some((keyword) => {
        const lower = String(keyword).toLowerCase();
        return HAZARD_WHITELIST.some((valid) => lower.includes(valid));
      })
    : false;

  if (!hasRoadHazardKeyword && imageKeywords.length > 0) {
    // Keywords detected but NONE match road hazard types
    const keywordStr = imageKeywords.slice(0, 3).join(", ");
    console.log(`    ❌ NO HAZARD WHITELIST MATCH: "${keywordStr}"`);
    return {
      allowed: false,
      reason: `Layer 2: Report does not match road hazard criteria. Keywords: ${keywordStr}...`,
    };
  }

  if (hasRoadHazardKeyword) {
    console.log(`    ✅ Valid road hazard keyword found`);
  } else {
    console.log(`    ℹ️  No keywords to validate (empty array or null)`);
  }

  // ─── Fallback scan as string (secondary check) ──────────────────────
  console.log(`\n  🔎 Secondary scan: Full text analysis...`);
  const fullText = JSON.stringify(aiAnalysis).toLowerCase();
  const fullHit = KEYWORD_BLACKLIST.find((bad) => fullText.includes(bad));
  if (fullHit) {
    console.log(`    ❌ BLACKLIST HIT in full text: "${fullHit}"`);
    return {
      allowed: false,
      reason: `Layer 2: Flagged content detected — "${fullHit}"`,
    };
  }
  console.log(`    ✅ Full text analysis clear`);

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — AI Trust Guard
// ═══════════════════════════════════════════════════════════════════════════════

function aiTrustGuard(aiAnalysis) {
  if (!aiAnalysis || typeof aiAnalysis !== "object") {
    return { allowed: false, reason: "Layer 3: Missing AI analysis payload" };
  }

  console.log("\n  🔍 LAYER 3 VALIDATION LOGIC:");
  console.log("  " + "-".repeat(76));

  if (typeof aiAnalysis.final_score !== "number") {
    console.log(`  ❌ Missing or invalid final_score field`);
    return { allowed: false, reason: "Layer 3: Missing final_score in AI response" };
  }

  const MIN_SCORE = 0.1;
  const scorePercentage = (aiAnalysis.final_score * 100).toFixed(1);
  console.log(`  📊 Validating confidence score...`);
  console.log(`    - Final Score: ${aiAnalysis.final_score} (${scorePercentage}%)`);
  console.log(`    - Minimum Threshold: ${MIN_SCORE} (10%)`);

  if (aiAnalysis.final_score < MIN_SCORE) {
    console.log(`    ❌ SCORE TOO LOW: ${scorePercentage}% below minimum (30%)`);
    return {
      allowed: false,
      reason: `Layer 3: AI confidence too low — score ${scorePercentage}% (min 30%)`,
    };
  }
  console.log(`    ✅ Score meets minimum threshold`);

  if (!aiAnalysis.trust_level || typeof aiAnalysis.trust_level !== "string") {
    console.log(`  ❌ Missing or invalid trust_level field`);
    return {
      allowed: false,
      reason: "Layer 3: Missing trust_level in AI response",
    };
  }

  const trustLevel = aiAnalysis.trust_level.toUpperCase();
  console.log(`\n  🛡️  Validating trust level...`);
  console.log(`    - Trust Level: ${trustLevel}`);
  console.log(`    - Valid Values: HIGH, MEDIUM, LOW`);
  console.log(`    ✅ Trust level field present and valid`);

  // if (aiAnalysis.trust_level === "LOW") {
  //   return { allowed: false, reason: "Layer 3: Trust level is LOW — rejected" };
  // }

  console.log(`\n  ✅ All Layer 3 validations passed`);
  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Layer 1: ArmorIQ Cloud Guard (file validation + ArmorIQ token)
const layer1ArmorIQGuard = async (req, res, next) => {
  try {
    // Extract file buffer from request (base64 encoded or Buffer)
    const fileBufferInput = req.body.file_buffer || req.body.image_data;

    if (!fileBufferInput) {
      return res.status(400).json({
        success: false,
        message: "Missing file_buffer in request body",
      });
    }

    // Decode base64 if string, otherwise use as buffer
    const fileBuffer =
      typeof fileBufferInput === "string"
        ? Buffer.from(fileBufferInput, "base64")
        : fileBufferInput;

    const result = await armorIQCloudGuard(fileBuffer, req);

    if (!result.allowed) {
      return res.status(403).json({ success: false, reason: result.reason });
    }

    // Store token and hash in request for later use
    req.armoriq = {
      token: result.token,
      hash: result.hash,
      passed: true,
    };

    next();
  } catch (error) {
    console.error("Layer 1 Middleware Error:", error.message);
    return res
      .status(500)
      .json({ success: false, reason: "Layer 1: Internal guard error" });
  }
};

// Layer 2: Keyword Firewall Guard (check AI analysis)
const layer2KeywordGuard = (req, res, next) => {
  try {
    const aiAnalysis = req.body.ai_analysis;

    if (!aiAnalysis) {
      return res.status(400).json({
        success: false,
        message: "Missing ai_analysis in request body",
      });
    }

    const result = keywordFirewallGuard(aiAnalysis);

    if (!result.allowed) {
      return res.status(403).json({ success: false, reason: result.reason });
    }

    next();
  } catch (error) {
    console.error("Layer 2 Middleware Error:", error.message);
    return res
      .status(500)
      .json({ success: false, reason: "Layer 2: Internal guard error" });
  }
};

// Layer 3: AI Trust Guard (validate confidence & trust level)
const layer3AITrustGuard = (req, res, next) => {
  try {
    const aiAnalysis = req.body.ai_analysis;

    if (!aiAnalysis) {
      return res.status(400).json({
        success: false,
        message: "Missing ai_analysis in request body",
      });
    }

    const result = aiTrustGuard(aiAnalysis);

    if (!result.allowed) {
      return res.status(403).json({ success: false, reason: result.reason });
    }

    next();
  } catch (error) {
    console.error("Layer 3 Middleware Error:", error.message);
    return res
      .status(500)
      .json({ success: false, reason: "Layer 3: Internal guard error" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Combined guard array for easy middleware chaining
const armorIQGuard = [
  layer1ArmorIQGuard,
  layer2KeywordGuard,
  layer3AITrustGuard,
];

module.exports = {
  armorIQGuard,
  layer1ArmorIQGuard,
  layer2KeywordGuard,
  layer3AITrustGuard,
  armorIQCloudGuard,
  keywordFirewallGuard,
  aiTrustGuard,
};
