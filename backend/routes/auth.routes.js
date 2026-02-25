const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, logout, refreshToken, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Rate limiter for login — 10 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/me", authenticate, getMe);

module.exports = router;
