/**
 * Validators for authentication routes
 * Add input validation rules here using express-validator
 */

const { body } = require("express-validator");

// POST /auth/register validation
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("phone")
    .optional()
    .trim(),
];

// POST /auth/login validation
const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// POST /auth/google validation
const googleAuthValidation = [
  body("id_token")
    .notEmpty()
    .withMessage("Google ID token is required"),
];

// POST /auth/official validation
const officialAuthValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  body("department")
    .optional()
    .trim(),
];

module.exports = {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  officialAuthValidation,
};
