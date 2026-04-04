/**
 * Validators for hazard routes
 * Add input validation rules here using express-validator
 */

const { body, query } = require("express-validator");

// ✨ POST /hazards validation - FILE UPLOAD MODE
// Frontend: Upload IMAGE FILE + complaint_description
// Backend: Extracts GPS from EXIF + Calls AI API automatically
const createHazardValidation = [
  // Image file is handled by Multer middleware, not express-validator

  // Optional GPS coordinates (if not in EXIF metadata)
  body("gps_latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("gps_longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  // Optional description from user
  body("complaint_description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

// GET /hazards validation
const getHazardsValidation = [
  query("status")
    .optional()
    .isIn(["active", "under_review", "resolved"])
    .withMessage("Invalid status"),
  query("type")
    .optional()
    .isIn(["pothole", "crack", "debris", "flooding", "signage", "other"])
    .withMessage("Invalid hazard type"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  query("long")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  query("radius")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Radius must be positive"),
];

// PATCH /hazards/:id/resolve validation
const resolveHazardValidation = [
  // proof_image file is handled by Multer middleware, not express-validator
  // No additional validation needed — file upload is required by multer
];

module.exports = {
  createHazardValidation,
  getHazardsValidation,
  resolveHazardValidation,
};
