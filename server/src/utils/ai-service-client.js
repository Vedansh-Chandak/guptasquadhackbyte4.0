const axios = require("axios");
require("dotenv").config();

// ─── External AI Service API Client ───────────────────────────────────────────
// Uses AI_SERVICE_URL from .env file

/**
 * Call external /analyze endpoint to get AI analysis via URL
 * @param {string} imageUrl - URL of the hazard image
 * @returns {Promise<Object>} - { severity, category, description }
 */
const analyzeImage = async (imageUrl) => {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
      image_url: imageUrl,
    });

    return response.data; // { severity, category, description }
  } catch (error) {
    console.error("❌ AI Service /analyze error:", error.message);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
};

/**
 * Call external /analyze-image endpoint for comprehensive analysis
 * Requires file upload (multipart/form-data)
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} description - Optional complaint description
 * @returns {Promise<Object>} - Complete analysis response { trust_level, final_score, image_keywords, ... }
 */
const analyzeImageWithFile = async (fileBuffer, description = null) => {
  try {
    const FormData = require("form-data");
    const form = new FormData();

    form.append("image", fileBuffer, "image.jpg");
    if (description) {
      form.append("complaint_description", description);
    }

    console.log("\n" + "═".repeat(80));
    console.log("🔗 EXTERNAL AI SERVICE REQUEST");
    console.log("═".repeat(80));
    console.log(`  Request Method: POST`);
    console.log(`  Endpoint: ${process.env.AI_SERVICE_URL}/analyze-image`);
    console.log(`  Content-Type: multipart/form-data`);
    console.log(`\n  📤 Request Payload:`);
    console.log(`    - Image Buffer Size: ${fileBuffer.length} bytes`);
    console.log(`    - Complaint Description: "${description || "NOT PROVIDED"}"`);

    const startTime = Date.now();
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/analyze-image`, form, {
      headers: form.getHeaders(),
    });
    const responseTime = Date.now() - startTime;

    console.log(`\n  ✅ AI SERVICE RESPONSE RECEIVED`);
    console.log(`  Response Time: ${responseTime}ms`);
    console.log(`  HTTP Status: ${response.status}`);
    console.log(`\n  📥 Response Data:`);
    
    const data = response.data;
    console.log(`    - Status: ${data.status}`);
    console.log(`    - Complaint ID: ${data.complaint_id || "N/A"}`);
    console.log(`    - Final Score: ${data.final_score || "N/A"}`);
    console.log(`    - Trust Level: ${data.trust_level || "N/A"}`);
    console.log(`    - Verified: ${data.verified || "N/A"}`);
    console.log(`    - Image URL: ${data.image_cloudinary_url ? "✅ Cloudinary URL generated" : "❌ No URL"}`);
    console.log(`    - Processing Time on Server: ${data.processing_time_ms || "N/A"}ms`);

    console.log("\n" + "═".repeat(80) + "\n");

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error("\n" + "═".repeat(80));
    console.error("❌ AI SERVICE ERROR");
    console.error("═".repeat(80));
    console.error(`  Error Message: ${errorMsg}`);
    console.error(`  Status Code: ${error.response?.status || "N/A"}`);
    console.error(`  Endpoint: ${process.env.AI_SERVICE_URL}/analyze-image`);
    console.error("═".repeat(80) + "\n");
    throw new Error(`Failed to analyze image file: ${error.message}`);
  }
};

/**
 * Call external /verify endpoint to verify repair
 * @param {string} originalImageUrl - Original hazard image URL
 * @param {string} repairImageUrl - Repair completion image URL
 * @returns {Promise<Object>} - { verified, confidence, reason }
 */
const verifyRepair = async (originalImageUrl, repairImageUrl) => {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/verify`, {
      original_image_url: originalImageUrl,
      repair_image_url: repairImageUrl,
    });

    return response.data; // { verified, confidence, reason }
  } catch (error) {
    console.error("❌ AI Service /verify error:", error.message);
    throw new Error(`Failed to verify repair: ${error.message}`);
  }
};

/**
 * Validate resolved hazard via external compare-image API
 * Sends file upload + hazard metadata to validation API
 * @param {Buffer} proofImageBuffer - Proof image file buffer
 * @param {Object} hazardMetadata - Hazard context (id, image_url, type, etc.)
 * @returns {Promise<Object>} - complete API response object
 */
const validateHazardRepair = async (proofImageBuffer, hazardMetadata) => {
  try {
    const FormData = require("form-data");
    const form = new FormData();

    // Append proof image
    form.append("proof_image", proofImageBuffer, "proof_image.jpg");

    // Append hazard metadata
    form.append("hazard_id", hazardMetadata.hazard_id);
    form.append("hazard_image_url", hazardMetadata.hazard_image_url);
    form.append("hazard_type", hazardMetadata.hazard_type);
    form.append("hazard_description", hazardMetadata.hazard_description);
    form.append("hazard_latitude", hazardMetadata.hazard_latitude);
    form.append("hazard_longitude", hazardMetadata.hazard_longitude);
    form.append("hazard_timestamp", hazardMetadata.hazard_timestamp);

    const endpoint = `${process.env.VALIDATION_API_BASE || "https://compare-image.onrender.com"}/hazard/${hazardMetadata.hazard_id}/verify`;
    const response = await axios.post(endpoint, form, {
      headers: form.getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("❌ Validation API /verify error:", error.message);
    throw new Error(`Failed to validate repair: ${error.message}`);
  }
};

/**
 * Map external AI response to internal Hazard schema
 * @param {Object} aiResponse - Response from /analyze-image or /analyze
 * @returns {Object} - Mapped data for Hazard model
 */
const mapAIResponseToHazard = (aiResponse) => {
  // ─── Helper: Map external category to internal hazard_type ──────
  const mapCategoryToType = (category) => {
    const categoryMap = {
      pothole: "pothole",
      garbage: "debris",
      waterlogging: "flooding",
      road_damage: "crack",
      other: "other",
    };
    return categoryMap[category] || "other";
  };

  // ─── Handle /analyze-image response (comprehensive) ─────────────
  if (aiResponse.trust_level && aiResponse.final_score !== undefined) {
    const keywords =
      aiResponse.layer_2_hf_classification?.image_keywords || [];
    const primaryKeyword = keywords[0] || "other";

    return {
      final_score: parseFloat(aiResponse.final_score),
      trust_level: aiResponse.trust_level.toUpperCase(),
      image_keywords: keywords,
      description: aiResponse.image_description || "",
      hazard_type: mapCategoryToType(primaryKeyword), // Map first keyword to type
      image_url:  aiResponse.image_cloudinary_url ,
    };
  }

  // ─── Handle /analyze response (simple) ──────────────────────────
  // External API returns: { severity, category, description }
  // category: "pothole|garbage|waterlogging|road_damage|other"
  if (aiResponse.severity && aiResponse.category) {
    const severity = parseInt(aiResponse.severity);
    const finalScore = severity / 10; // Scale from 1-10 to 0-1

    return {
      final_score: finalScore,
      trust_level: severity >= 7 ? "HIGH" : severity >= 4 ? "MEDIUM" : "LOW",
      image_keywords: [aiResponse.category],
      description: aiResponse.description || "",
      hazard_type: mapCategoryToType(aiResponse.category),
    };
  }

  // ─── Fallback ──────────────────────────────────────────────────
  return {
    final_score: 0.5,
    trust_level: "MEDIUM",
    image_keywords: [],
    description: "",
    hazard_type: "other",
  };
};

module.exports = {
  analyzeImage,
  analyzeImageWithFile,
  verifyRepair,
  validateHazardRepair,
  mapAIResponseToHazard,
};
