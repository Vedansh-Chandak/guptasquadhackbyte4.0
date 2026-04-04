/**
 * Validators for comment routes
 * Add input validation rules here using express-validator
 */

const { body } = require("express-validator");

// POST /hazards/:id/comments validation
const addCommentValidation = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ min: 1, max: 300 })
    .withMessage("Comment must be between 1 and 300 characters"),
];

module.exports = {
  addCommentValidation,
};
