const dns = require("dns");
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Import routes
const authRoutes = require("./src/routes/auth.routes");
const hazardRoutes = require("./src/routes/hazard.routes");
const commentRoutes = require("./src/routes/comment.routes");

// Import database connection
const connectDB = require("./src/config/db");

// Middleware & Error Handlers
const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "*"
  ],
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/hazards", hazardRoutes);
app.use("/hazards", commentRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "RoadRash Backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 + Global Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Database + Server Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 RoadRash server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
