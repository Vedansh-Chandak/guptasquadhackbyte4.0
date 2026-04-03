const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    auth_method: {
      type: String,
      enum: ["email", "google"],
      required: true,
      default: "email",
    },
    password_hash: {
      type: String,
      select: false, // Never returned in queries by default
      default: null,
    },
    google_id: {
      type: String,
      default: null,
      sparse: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    is_official: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      default: null, // Only for official users
    },
    trust_score: {
      type: Number,
      default: 50, // Out of 100; grows with accurate reports
      min: 0,
      max: 100,
    },
    total_reports_made: {
      type: Number,
      default: 0,
    },
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ google_id: 1 }, { sparse: true });

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password_hash")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

// ─── Compare password ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// ─── Safe public profile ──────────────────────────────────────────────────────
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    avatar_url: this.avatar_url,
    is_official: this.is_official,
    department: this.department,
    trust_score: this.trust_score,
    total_reports_made: this.total_reports_made,
  };
};

module.exports = mongoose.model("User", userSchema);
