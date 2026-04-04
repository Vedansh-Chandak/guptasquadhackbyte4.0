const Hazard = require("../models/Hazard.model");
const Comment = require("../models/Comment.model");
const User = require("../models/User.model");
const {
  analyzeImageWithFile,
  mapAIResponseToHazard,
  validateHazardRepair,
} = require("../utils/armoriq-client");
const { extractGPSFromImage } = require("../utils/exif-helper");
const {
  keywordFirewallGuard,
  aiTrustGuard,
} = require("../middleware/armoriq.middleware");

// ─── POST /hazards ────────────────────────────────────────────────────────────
// createHazard
// ✨ NEW FLOW: Frontend uploads IMAGE FILE + DESCRIPTION
// Backend: Extracts GPS from EXIF → Calls AI API → ArmorIQ Guards → Saves hazard
const createHazard = async (req, res, next) => {
  try {
    // ═════════════════════════════════════════════════════════════════════
    // STAGE 1: USER INPUT VALIDATION
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n" + "=".repeat(80));
    console.log("🚀 NEW HAZARD COMPLAINT - PROCESSING STARTED");
    console.log("=".repeat(80) + "\n");

    const { complaint_description, gps_latitude, gps_longitude } = req.body;
    const imageFile = req.file; // Multer stores uploaded file here
    const userId = req.user?._id || "UNKNOWN";
    const userName = req.user?.name || "UNKNOWN";

    console.log("📋 STAGE 1: USER INPUT RECEIVED");
    console.log("-".repeat(80));
    console.log(`  👤 User ID: ${userId}`);
    console.log(`  👤 User Name: ${userName}`);
    console.log(`  📝 Complaint Description: "${complaint_description || "NOT PROVIDED"}"`);
    console.log(`  📍 GPS Latitude (provided): ${gps_latitude || "NOT PROVIDED"}`);
    console.log(`  📍 GPS Longitude (provided): ${gps_longitude || "NOT PROVIDED"}`);

    // ── Validate file upload ──────────────────────────────────────
    if (!imageFile) {
      console.error("❌ IMAGE VALIDATION FAILED: No image file provided");
      return res.status(400).json({
        success: false,
        message: "Image file is required. Please upload an image.",
      });
    }

    console.log(`  📸 Image File Name: ${imageFile.originalname}`);
    console.log(`  📸 Image MIME Type: ${imageFile.mimetype}`);
    console.log(`  📸 Image Size: ${(imageFile.size / 1024).toFixed(2)} KB`);
    console.log(`  ✅ IMAGE VALIDATION PASSED\n`);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 2: GPS EXTRACTION FROM EXIF
    // ═════════════════════════════════════════════════════════════════════
    console.log("📍 STAGE 2: GPS DATA EXTRACTION");
    console.log("-".repeat(80));

    let gpsData = {
      lat: null,
      long: null,
    };

    const exifGPS = await extractGPSFromImage(imageFile.buffer);

    if (exifGPS.hasGPS) {
      gpsData.lat = exifGPS.lat;
      gpsData.long = exifGPS.long;
      console.log(`  ✅ GPS found in EXIF metadata`);
      console.log(`  📍 Extracted Latitude: ${gpsData.lat}`);
      console.log(`  📍 Extracted Longitude: ${gpsData.long}\n`);
    } else {
      // ── NO EXIF GPS → Hard reject. Do NOT call AI. Do NOT save. ──────────
      console.error(
        "❌ GPS VALIDATION FAILED: Image has no EXIF GPS metadata. Aborting pipeline."
      );
      return res.status(400).json({
        success: false,
        error_code: "NO_EXIF_GPS",
        message:
          "Location metadata not found in image. Please enable location services on your camera and retake the photo.",
      });
    }

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 3: AI SERVICE ANALYSIS
    // ═════════════════════════════════════════════════════════════════════
    console.log("🤖 STAGE 3: AI SERVICE ANALYSIS");
    console.log("-".repeat(80));
    console.log(`  🔗 API Endpoint: ${process.env.AI_SERVICE_URL}/analyze-image`);
    console.log(`  📤 Sending Image: ${imageFile.originalname} (${(imageFile.size / 1024).toFixed(2)} KB)`);
    console.log(`  📤 Sending Description: "${complaint_description || "EMPTY"}"`);

    let aiAnalysis = {};
    let rawAIResponse = null;

    try {
      const externalAIResponse = await analyzeImageWithFile(
        imageFile.buffer,
        complaint_description
      );
      rawAIResponse = externalAIResponse;

      console.log(`\n  ✅ AI RESPONSE RECEIVED`);
      console.log(`  📊 Status: ${externalAIResponse.status || "N/A"}`);
      console.log(`  📊 Complaint ID: ${externalAIResponse.complaint_id || "N/A"}`);
      console.log(`  📊 Final Score: ${externalAIResponse.final_score || "N/A"}`);
      console.log(`  📊 Trust Level: ${externalAIResponse.trust_level || "N/A"}`);
      console.log(`  📊 Verified: ${externalAIResponse.verified || "N/A"}`);

      if (externalAIResponse.layer_2_hf_classification) {
        const layer2 = externalAIResponse.layer_2_hf_classification;
        console.log(`\n  📊 AI Classification Details:`);
        console.log(`    - Model Prediction: ${layer2.model_prediction || "N/A"}`);
        console.log(`    - Model Confidence: ${layer2.model_confidence || "N/A"}`);
        console.log(`    - Problem Type: ${layer2.problem_type || "N/A"}`);
        console.log(`    - Tampering Detected: ${layer2.tampering_detected || "N/A"}`);
        console.log(`    - Image Keywords: ${JSON.stringify(layer2.image_keywords || [])}`);
      }

      if (externalAIResponse.keyword_analysis) {
        const keywords = externalAIResponse.keyword_analysis;
        console.log(`\n  📊 Keyword Analysis:`);
        console.log(`    - User Keywords: ${JSON.stringify(keywords.user_description_keywords || [])}`);
        console.log(`    - Image Keywords: ${JSON.stringify(keywords.image_analysis_keywords || [])}`);
        console.log(`    - Keyword Match Score: ${keywords.keyword_match_score || "N/A"}`);
      }

      if (externalAIResponse.layer_1_metadata) {
        const metadata = externalAIResponse.layer_1_metadata;
        console.log(`\n  📊 EXIF Metadata from AI:`);
        console.log(`    - Metadata Score: ${metadata.metadata_score || "N/A"}`);
        console.log(`    - Timestamp: ${metadata.timestamp_original || "N/A"}`);
        console.log(`    - Device: ${metadata.device_make || "N/A"} ${metadata.device_model || "N/A"}`);
        if (metadata.image_location) {
          console.log(`    - Location: ${metadata.image_location.address || "N/A"}`);
        }
      }

      // Map external response to internal format
      aiAnalysis = mapAIResponseToHazard(externalAIResponse);
      console.log('\n  ✅ AI Response mapped to internal schema\n');

      // ── Final Score Gate: reject low-impact reports before any DB write ──
      const rawScore = parseFloat(externalAIResponse.final_score);
      console.log('  🔍 FINAL SCORE GATE: score=' + rawScore + ' (threshold > 0.4)');
      if (!isNaN(rawScore) && rawScore <= 0.4) {
        console.warn('  ❌ SCORE TOO LOW (' + rawScore + ' ≤ 0.4) — Not saving to DB.');
        return res.status(422).json({
          success: false,
          error_code: 'LOW_IMPACT_SCORE',
          message: 'Your report does not show enough impact to be filed. The hazard may not be significant enough or the image may not clearly show the issue.',
          final_score: rawScore,
          trust_level: externalAIResponse.trust_level || 'LOW',
          flags: externalAIResponse.flags || [],
        });
      }
      console.log('  ✅ SCORE GATE PASSED (' + rawScore + ' > 0.4)\n');
    } catch (aiError) {
      console.error(`\n  ❌ AI ANALYSIS FAILED: ${aiError.message}`);
      console.warn(`  ⚠️  Using default/fallback values for safety`);
      aiAnalysis = {
        final_score: 0.5,
        trust_level: "MEDIUM",
        image_keywords: [],
        description: complaint_description || "",
        hazard_type: "other",
      };
      console.log(`\n  🔄 Fallback AI Analysis: ${JSON.stringify(aiAnalysis)}\n`);
    }

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 4: ARMORIQ VALIDATION LAYER 2 - KEYWORD FIREWALL
    // ═════════════════════════════════════════════════════════════════════
    console.log("🛡️  STAGE 4: ARMORIQ LAYER 2 - KEYWORD FIREWALL GUARD");
    console.log("-".repeat(80));
    console.log(`  🔐 Validating with ARMORIQ_API_KEY: ${process.env.ARMORIQ_API_KEY?.substring(0, 15)}...`);
    console.log(`  🔐 Using Agent ID: ${process.env.ARMORIQ_AGENT_ID}`);
    console.log(`  🔐 Using User ID: ${process.env.ARMORIQ_USER_ID}`);
    console.log(`\n  📊 Input to Layer 2:`);
    console.log(`    - Image Keywords: ${JSON.stringify(aiAnalysis.image_keywords || [])}`);
    console.log(`    - Trust Level: ${aiAnalysis.trust_level}`);
    console.log(`    - Final Score: ${aiAnalysis.final_score}`);

    const layer2Result = keywordFirewallGuard(aiAnalysis);
    if (!layer2Result.allowed) {
      console.error(`\n  ❌ LAYER 2 VALIDATION FAILED`);
      console.error(`  ❌ Reason: ${layer2Result.reason}\n`);
      return res.status(403).json({
        success: false,
        message: "Report rejected by security filter",
        reason: layer2Result.reason,
      });
    }
    console.log(`  ✅ LAYER 2 PASSED - Keywords validated\n`);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 5: ARMORIQ VALIDATION LAYER 3 - AI TRUST GUARD
    // ═════════════════════════════════════════════════════════════════════
    console.log("🛡️  STAGE 5: ARMORIQ LAYER 3 - AI TRUST GUARD");
    console.log("-".repeat(80));
    console.log(`  📊 Input to Layer 3:`);
    console.log(`    - Final Score: ${aiAnalysis.final_score}`);
    console.log(`    - Trust Level: ${aiAnalysis.trust_level}`);
    console.log(`    - Hazard Type: ${aiAnalysis.hazard_type}`);

    const layer3Result = aiTrustGuard(aiAnalysis);
    if (!layer3Result.allowed) {
      console.error(`\n  ❌ LAYER 3 VALIDATION FAILED`);
      console.error(`  ❌ Reason: ${layer3Result.reason}\n`);
      return res.status(403).json({
        success: false,
        message: "Report confidence too low or invalid",
        reason: layer3Result.reason,
      });
    }
    console.log(`  ✅ LAYER 3 PASSED - AI Trust validation successful`);
    console.log(`    - Trust Level: ${aiAnalysis.trust_level}`);
    console.log(`    - Final Score: ${aiAnalysis.final_score}\n`);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 6: MONGODB SAVE - DATA PERSISTENCE
    // ═════════════════════════════════════════════════════════════════════
    console.log("💾 STAGE 6: MONGODB DATA PERSISTENCE");
    console.log("-".repeat(80));

    // ── Field Mapping: Extracted Data + AI Analysis → DB Schema ──
    const reportImageUrl = aiAnalysis.image_url || imageFile.originalname;

    const hazardData = {
      image_url: reportImageUrl,
      lat: gpsData.lat,
      long: gpsData.long,
      type: aiAnalysis.hazard_type || "other",
      user_id: req.user._id,
      final_score: parseFloat(aiAnalysis.final_score) || 0.5,
      trust_level: aiAnalysis.trust_level || "MEDIUM",
      image_keywords: aiAnalysis.image_keywords || [],
      description: aiAnalysis.description || complaint_description || "",
    };

    console.log(`  📝 Data to be saved to MongoDB Hazard collection:`);
    console.log(`    {`);
    console.log(`      "image_url": "${hazardData.image_url}",`);
    console.log(`      "lat": ${hazardData.lat},`);
    console.log(`      "long": ${hazardData.long},`);
    console.log(`      "type": "${hazardData.type}",`);
    console.log(`      "user_id": "${hazardData.user_id}",`);
    console.log(`      "final_score": ${hazardData.final_score},`);
    console.log(`      "trust_level": "${hazardData.trust_level}",`);
    console.log(`      "image_keywords": ${JSON.stringify(hazardData.image_keywords)},`);
    console.log(`      "description": "${hazardData.description}"`);
    console.log(`    }`);

    const hazard = new Hazard(hazardData);
    console.log(`\n  💾 Saving to MongoDB...`);
    await hazard.save(); // Pre-save hook calculates priority_score
    console.log(`  ✅ Hazard saved successfully!`);
    console.log(`  📌 Hazard ID: ${hazard._id}`);
    console.log(`  📊 Priority Score (auto-calculated): ${hazard.priority_score || "N/A"}`);
    console.log(`  📊 Status: ${hazard.status || "active"}`);

    // ── Increment user's report count ──────────────────────────────
    console.log(`\n  👤 Updating user report count...`);
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { total_reports_made: 1 },
    });
    console.log(`  ✅ User total_reports_made incremented`);

    await hazard.populate("user_id", "name avatar_url is_official");

    // ═════════════════════════════════════════════════════════════════════
    // SUMMARY: COMPLETE FLOW
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n" + "=".repeat(80));
    console.log("✅ HAZARD COMPLAINT PROCESSING COMPLETE");
    console.log("=".repeat(80) + "\n");
    console.log("📋 FINAL SUMMARY:");
    console.log("-".repeat(80));
    console.log(`  👤 Reporter: ${userName} (ID: ${userId})`);
    console.log(`  📝 Complaint: "${complaint_description}"`);
    console.log(`  📸 Image: ${imageFile.originalname}`);
    console.log(`  📍 Location: (${gpsData.lat}, ${gpsData.long})`);
    console.log(`\n  🤖 AI Analysis:`);
    console.log(`    - Status: SUCCESS`);
    console.log(`    - Final Score: ${aiAnalysis.final_score}`);
    console.log(`    - Trust Level: ${aiAnalysis.trust_level}`);
    console.log(`    - Hazard Type: ${aiAnalysis.hazard_type}`);
    console.log(`    - Keywords: ${JSON.stringify(aiAnalysis.image_keywords)}`);
    console.log(`\n  🛡️  ArmorIQ Validations:`);
    console.log(`    - Layer 2 (Keyword Firewall): ✅ PASSED`);
    console.log(`    - Layer 3 (AI Trust Guard): ✅ PASSED`);
    console.log(`\n  💾 MongoDB Save:`);
    console.log(`    - Status: ✅ SUCCESS`);
    console.log(`    - Hazard ID: ${hazard._id}`);
    console.log(`    - Priority Score: ${hazard.priority_score}`);
    console.log(`    - Collection: hazards`);
    console.log("\n" + "=".repeat(80) + "\n");

    return res.status(201).json({
      success: true,
      message: "Hazard reported successfully.",
      hazard,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /hazards ─────────────────────────────────────────────────────────────
// getHazards
// Returns all active hazards sorted by priority_score descending
const getHazards = async (req, res, next) => {
  try {
    const {
      status = "active",
      type,
      limit = 50,
      page = 1,
      lat,
      long,
      radius,
    } = req.query;

    const filter = {};

    // Filter by status
    if (status) filter.status = status;

    // Filter by hazard type
    if (type) filter.type = type;

    // Geo-bounding box filter (simple, non-spherical — use $geoNear for production)
    if (lat && long && radius) {
      const r = parseFloat(radius) / 111; // Rough degrees per km
      filter.lat = {
        $gte: parseFloat(lat) - r,
        $lte: parseFloat(lat) + r,
      };
      filter.long = {
        $gte: parseFloat(long) - r,
        $lte: parseFloat(long) + r,
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Hazard.countDocuments(filter);

    const hazards = await Hazard.find(filter)
      .sort({ priority_score: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user_id", "name avatar_url is_official trust_score");

    // Get comment counts for all hazards in this batch
    const hazardIds = hazards.map(h => h._id);
    const commentCounts = await Comment.aggregate([
      { $match: { hazard_id: { $in: hazardIds } } },
      { $group: { _id: "$hazard_id", count: { $sum: 1 } } }
    ]);

    // Create a map of hazard_id -> comment count
    const commentCountMap = new Map();
    commentCounts.forEach(item => {
      commentCountMap.set(item._id.toString(), item.count);
    });

    // Inject counter fields
    const hazardsWithCounters = hazards.map(hazard => ({
      ...hazard.toObject(),
      counter: {
        upvotes: hazard.upvoted_by?.length || 0,
        comments: commentCountMap.get(hazard._id.toString()) || 0,
        confirmations: hazard.confirmed_by?.length || 0,
      }
    }));

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hazards: hazardsWithCounters,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /hazards/:id ─────────────────────────────────────────────────────────
const getHazardById = async (req, res, next) => {
  try {
    const hazard = await Hazard.findById(req.params.id).populate(
      "user_id",
      "name avatar_url is_official trust_score"
    );

    if (!hazard) {
      return res.status(404).json({ success: false, message: "Hazard not found." });
    }

    // Get comment count for this hazard
    const commentCount = await Comment.countDocuments({ hazard_id: req.params.id });

    // Inject counter fields
    const hazardWithCounters = {
      ...hazard.toObject(),
      counter: {
        upvotes: hazard.upvoted_by?.length || 0,
        comments: commentCount,
        confirmations: hazard.confirmed_by?.length || 0,
      }
    };

    return res.status(200).json({ success: true, hazard: hazardWithCounters });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /hazards/:id/upvote ────────────────────────────────────────────────
// toggleUpvote
const toggleUpvote = async (req, res, next) => {
  try {
    const hazard = await Hazard.findById(req.params.id);

    if (!hazard) {
      return res.status(404).json({ success: false, message: "Hazard not found." });
    }

    if (hazard.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Cannot upvote a resolved hazard.",
      });
    }

    const userId = req.user._id.toString();
    const hasUpvoted = hazard.upvoted_by.some((id) => id.toString() === userId);

    if (hasUpvoted) {
      // Remove upvote
      hazard.upvoted_by = hazard.upvoted_by.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Add upvote
      hazard.upvoted_by.push(req.user._id);
    }

    await hazard.save(); // Pre-save hook recalculates priority_score

    // Get comment count for this hazard
    const commentCount = await Comment.countDocuments({ hazard_id: req.params.id });

    return res.status(200).json({
      success: true,
      message: hasUpvoted ? "Upvote removed." : "Upvote added.",
      upvote_count: hazard.upvoted_by.length,
      priority_score: hazard.priority_score,
      user_has_upvoted: !hasUpvoted,
      counter: {
        upvotes: hazard.upvoted_by.length,
        comments: commentCount,
        confirmations: hazard.confirmed_by?.length || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /hazards/:id/resolve ───────────────────────────────────────────────
// resolveHazard — Officials only
const resolveHazard = async (req, res, next) => {
  try {
    console.log("\n" + "═".repeat(80));
    console.log("🔧 HAZARD RESOLUTION PROCESS STARTED");
    console.log("═".repeat(80) + "\n");

    const proofImageFile = req.file; // Multer stores uploaded file here

    if (!proofImageFile) {
      console.error("❌ PROOF IMAGE VALIDATION FAILED: No image file provided");
      return res.status(400).json({
        success: false,
        message: "Proof image file is required. Please upload an image.",
      });
    }

    const hazardId = req.params.id;
    console.log("📋 STAGE 1: HAZARD LOOKUP");
    console.log("-".repeat(80));
    console.log(`  📌 Hazard ID: ${hazardId}`);
    console.log(`  📸 Proof Image: ${proofImageFile.originalname} (${(proofImageFile.size / 1024).toFixed(2)} KB)`);

    const hazard = await Hazard.findById(hazardId);

    if (!hazard) {
      console.error(`❌ Hazard not found: ${hazardId}`);
      return res.status(404).json({ success: false, message: "Hazard not found." });
    }

    console.log(`  ✅ Hazard found`);
    console.log(`  📊 Current Status: ${hazard.status}`);
    console.log(`  ⏰ Created At: ${hazard.createdAt}`);

    if (hazard.status === "resolved") {
      console.error(`❌ Hazard already resolved: ${hazardId}`);
      return res.status(400).json({
        success: false,
        message: "Hazard is already resolved.",
      });
    }

    // Build hazard metadata for validation API
    const hazardMetadata = {
      hazard_id: hazard._id.toString(),
      hazard_image_url: hazard.image_url,
      hazard_type: hazard.type,
      hazard_description: hazard.description,
      hazard_latitude: hazard.lat,
      hazard_longitude: hazard.long,
      hazard_timestamp: hazard.createdAt ? hazard.createdAt.toISOString() : new Date().toISOString(),
      officer_id: req.user?.username || req.user?.id || "official", // pass official id from token
    };

    console.log("\n📋 STAGE 2: VALIDATION API CALL");
    console.log("-".repeat(80));
    console.log(`  🔗 API Endpoint: ${process.env.VALIDATION_API_BASE}/hazard/${hazardId}/verify`);
    console.log(`  📤 Sending Hazard Type: ${hazard.type}`);
    console.log(`  📤 Officer ID: ${hazardMetadata.officer_id}`);

    // Call validation API with proof image file buffer
    let validationResponse;
    try {
      console.log(`\n  📡 Calling Validation API with proof image...`);
      validationResponse = await validateHazardRepair(
        proofImageFile.buffer,
        hazardMetadata
      );
      console.log(`  ✅ Validation API response received`);
    } catch (apiError) {
      console.error(`\n  ❌ Validation API error: ${apiError.message}`);
      return res.status(502).json({
        success: false,
        message: "Validation service error.",
        reason: apiError.message,
      });
    }

    // Check verification status
    const verificationResult = validationResponse?.verification_result || {};

    console.log(`\n  📊 Verification Result: ${verificationResult.status}`);
    if (verificationResult.confidence !== undefined) {
      console.log(`  📊 Confidence: ${(verificationResult.confidence * 100).toFixed(1)}%`);
    }

    if (verificationResult.status !== "resolved") {
      console.error(`❌ Resolution verification failed: ${verificationResult.status}`);
      return res.status(400).json({
        success: false,
        message: "Hazard resolution could not be verified.",
        verification_result: verificationResult,
      });
    }

    console.log("\n📋 STAGE 3: REPAIR TIMELINE CALCULATION");
    console.log("-".repeat(80));

    // Update hazard with resolved state
    const resolvedAt = new Date();
    hazard.status = "resolved";
    hazard.resolved_at = resolvedAt;
    hazard.repair_image_url = validationResponse.proof_image_cloudinary_url || proofImageFile.originalname;

    // Calculate repair timeline in minutes
    let repairTimelineMinutes = null;

    // Check if validation API provided a valid time (greater than 0)
    if (
      validationResponse.metadata &&
      typeof validationResponse.metadata.time_taken_hours === "number" &&
      validationResponse.metadata.time_taken_hours > 0
    ) {
      // Use time from validation API only if it's greater than 0
      repairTimelineMinutes = Math.round(
        validationResponse.metadata.time_taken_hours * 60
      );
      console.log(`  ✅ Time from Validation API: ${validationResponse.metadata.time_taken_hours} hours`);
      console.log(`  📊 Converted to minutes: ${repairTimelineMinutes} minutes`);
    } else if (validationResponse.metadata?.time_taken_hours === 0) {
      // API returned 0, use timestamp-based calculation instead
      console.log(`  ℹ️  Validation API returned 0 hours, using timestamp-based calculation...`);
      
      if (hazard.createdAt) {
        const timeDiffMs = resolvedAt.getTime() - hazard.createdAt.getTime();
        repairTimelineMinutes = Math.round(timeDiffMs / (1000 * 60));

        console.log(`  ✅ Calculated from timestamps:`);
        console.log(`    - Created At: ${hazard.createdAt.toLocaleString()}`);
        console.log(`    - Resolved At: ${resolvedAt.toLocaleString()}`);
        console.log(`    - Time Difference: ${timeDiffMs}ms`);
        console.log(`    - Converted to Minutes: ${repairTimelineMinutes} minutes`);

        // Convert to human-readable format
        const hours = Math.floor(repairTimelineMinutes / 60);
        const mins = repairTimelineMinutes % 60;
        const days = Math.floor(hours / 24);
        const hoursLeft = hours % 24;

        if (days > 0) {
          console.log(`    - Human-Readable: ${days}d ${hoursLeft}h ${mins}m`);
        } else if (hours > 0) {
          console.log(`    - Human-Readable: ${hours}h ${mins}m`);
        } else {
          console.log(`    - Human-Readable: ${mins}m`);
        }
      }
    } else {
      // No time data from API, fall back to timestamp calculation
      if (hazard.createdAt) {
        const timeDiffMs = resolvedAt.getTime() - hazard.createdAt.getTime();
        repairTimelineMinutes = Math.round(timeDiffMs / (1000 * 60));

        console.log(`  ✅ Calculated from timestamps (no API data):`);
        console.log(`    - Created At: ${hazard.createdAt.toLocaleString()}`);
        console.log(`    - Resolved At: ${resolvedAt.toLocaleString()}`);
        console.log(`    - Time Difference: ${timeDiffMs}ms`);
        console.log(`    - Converted to Minutes: ${repairTimelineMinutes} minutes`);

        // Convert to human-readable format
        const hours = Math.floor(repairTimelineMinutes / 60);
        const mins = repairTimelineMinutes % 60;
        const days = Math.floor(hours / 24);
        const hoursLeft = hours % 24;

        if (days > 0) {
          console.log(`    - Human-Readable: ${days}d ${hoursLeft}h ${mins}m`);
        } else if (hours > 0) {
          console.log(`    - Human-Readable: ${hours}h ${mins}m`);
        } else {
          console.log(`    - Human-Readable: ${mins}m`);
        }
      } else {
        console.log(`  ⚠️  No createdAt timestamp available, setting repair_time_line to null`);
      }
    }

    hazard.repair_time_line = repairTimelineMinutes;

    console.log(`\n  💾 Final repair_time_line: ${repairTimelineMinutes} minutes`);

    await hazard.save();

    console.log("\n📋 STAGE 4: DATABASE UPDATE");
    console.log("-".repeat(80));
    console.log(`  ✅ Hazard marked as resolved`);
    console.log(`  📌 Hazard ID: ${hazard._id}`);
    console.log(`  📊 Status: ${hazard.status}`);
    console.log(`  ⏰ Resolved At: ${hazard.resolved_at}`);
    console.log(`  ⏱️  Repair Timeline: ${hazard.repair_time_line} minutes`);
    console.log(`  📸 Repair Image: ${hazard.repair_image_url}`);

    console.log("\n" + "═".repeat(80));
    console.log("✅ HAZARD RESOLUTION COMPLETE");
    console.log("═".repeat(80) + "\n");

    return res.status(200).json({
      success: true,
      message: validationResponse.message || "Hazard marked as resolved.",
      validation: validationResponse,
      hazard: {
        id: hazard._id,
        status: hazard.status,
        resolved_at: hazard.resolved_at,
        repair_time_line: hazard.repair_time_line,
        repair_image_url: hazard.repair_image_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHazard,
  getHazards,
  getHazardById,
  toggleUpvote,
  resolveHazard,
};