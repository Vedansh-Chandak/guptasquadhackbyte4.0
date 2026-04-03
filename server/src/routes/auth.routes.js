const express = require("express");
const router = express.Router();

const {
  registerWithEmail,
  loginWithEmail,
  googleAuth,
  officialAuth,
} = require("../controllers/auth.controller");

const {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  officialAuthValidation,
} = require("../validators/auth.validators");

const validate = require("../middleware/validate.middleware");

// POST /auth/register
router.post("/register", registerValidation, validate, registerWithEmail);

// POST /auth/login
router.post("/login", loginValidation, validate, loginWithEmail);

// POST /auth/google
router.post("/google", googleAuthValidation, validate, googleAuth);

// POST /auth/official
router.post("/official", officialAuthValidation, validate, officialAuth);

module.exports = router;
