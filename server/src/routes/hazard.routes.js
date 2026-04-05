const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createHazard,
  getHazards,
  getHazardById,
  getNearbyHazards,
  toggleUpvote,
  resolveHazard,
} = require("../controllers/hazard.controller");

const { requireAuth, requireOfficial } = require("../middleware/auth.middleware");
const { armorIQGuard } = require("../middleware/armoriq.middleware");
const validate = require("../middleware/validate.middleware");

const {
  createHazardValidation,
  getHazardsValidation,
  resolveHazardValidation,
} = require("../validators/hazard.validators");

// ─── Multer Configuration for Image Upload ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ─── Multer Error Handler ────────────────────────────────────────────────────
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: "Unexpected field. Please use 'proof_image' as the field name for the file upload."
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB."
      });
    }
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: "Only image files (JPG, PNG, WEBP) are allowed."
    });
  }
  next(err);
};

// ✨ POST /hazards — File Upload Mode
// Frontend: Upload IMAGE FILE + complaint_description
// Backend: Extract GPS from EXIF → Call AI API → Save hazard
//
// Middleware Chain:
// 1. requireAuth: Ensure user is logged in
// 2. upload.single("image"): Accept single image file with field name "image"
// 3. createHazardValidation: Validate complaint_description + gps (optional)
// 4. validate: Check validation errors
// 5. createHazard: Process, call external AI, save to DB
router.post(
  "/",
  requireAuth,
  upload.single("image"),        // Multer: Parse multipart form-data
  createHazardValidation,
  validate,
  createHazard
);


// GET /hazards/nearby?lat=XX&long=YY&radius=50
// Returns active hazards within radius metres of user (Haversine)
router.get('/nearby', getNearbyHazards);

// GET /hazards
router.get("/", getHazardsValidation, validate, getHazards);

// GET /hazards/:id
router.get("/:id", getHazardById);

// PATCH /hazards/:id/upvote
router.patch("/:id/upvote", requireAuth, toggleUpvote);

// PATCH /hazards/:id/resolve — Officials only
router.patch(
  "/:id/resolve",
  requireAuth,
  requireOfficial,
  upload.single("proof_image"),  // Multer: Accept single proof image file
  multerErrorHandler,            // Handle multer errors with custom messages
  resolveHazardValidation,
  validate,
  resolveHazard
);

module.exports = router;