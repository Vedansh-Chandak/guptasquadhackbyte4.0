const express = require("express");
const router = express.Router();

const { addComment, getHazardComments } = require("../controllers/comment.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { addCommentValidation } = require("../validators/comment.validators");

// POST /hazards/:id/comments
router.post("/:id/comments", requireAuth, addCommentValidation, validate, addComment);

// GET /hazards/:id/comments
router.get("/:id/comments", getHazardComments);

module.exports = router;
