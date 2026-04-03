const mongoose = require("mongoose");

const hazardSchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: [true, "Image URL is required"],
    },
    lat: {
      type: Number,
      required: [true, "Latitude is required"],
      min: -90,
      max: 90,
    },
    long: {
      type: Number,
      required: [true, "Longitude is required"],
      min: -180,
      max: 180,
    },
    type: {
      type: String,
      enum: ["pothole", "crack", "debris", "flooding", "signage", "other"],
      required: [true, "Hazard type is required"],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // ─── AI Verification Fields ─────────────────────────────────────
    final_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    trust_level: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
    },
    image_keywords: {
      type: [String],
      default: [],
    },

    // ─── Engagement ─────────────────────────────────────────────────
    upvoted_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    priority_score: {
      type: Number,
      default: 0,
    },

    // ─── Status & Resolution ────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "under_review", "resolved"],
      default: "active",
    },
    repair_image_url: {
      type: String,
      default: null,
    },
    repair_time_line: {
      type: Number, // Stored in minutes
      default: null,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
hazardSchema.index({ lat: 1, long: 1 });
hazardSchema.index({ priority_score: -1 });
hazardSchema.index({ status: 1 });
hazardSchema.index({ user_id: 1 });

// ─── Pre-save: Compute priority_score ────────────────────────────────────────
hazardSchema.pre("save", function (next) {
  const upvotes = this.upvoted_by ? this.upvoted_by.length : 0;
  this.priority_score = upvotes * 3 + this.final_score * 10 * 7;
  next();
});

module.exports = mongoose.model("Hazard", hazardSchema);
