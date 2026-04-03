const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    hazard_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hazard",
      required: [true, "Hazard ID is required"],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [300, "Comment cannot exceed 300 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
commentSchema.index({ hazard_id: 1 });
commentSchema.index({ user_id: 1 });

module.exports = mongoose.model("Comment", commentSchema);
