const bcrypt = require("bcrypt");
const pool = require("../config/db");
const {
    generateAccessToken,
    generateRefreshToken,
} = require("../utils/jwt.util");

// Cookie configuration
const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
});

/**
 * Helper: Store hashed refresh token in DB
 */
const storeRefreshToken = async (userId, rawToken) => {
    const hashedToken = await bcrypt.hash(rawToken, 12);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, hashedToken, expiresAt]
    );
};

/**
 * Helper: Set auth cookies on response
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, cookieOptions(15 * 60 * 1000));       // 15 min
    res.cookie("refreshToken", refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email, and password",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user
        const { rows } = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role, created_at`,
            [name, email, hashedPassword]
        );

        const user = rows[0];

        // Generate tokens
        const accessToken = generateAccessToken({ id: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store hashed refresh token in DB
        await storeRefreshToken(user.id, refreshToken);

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // Find user by email
        const { rows } = await pool.query(
            "SELECT id, name, email, password, role FROM users WHERE email = $1",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Revoke all existing refresh tokens for this user (fresh login = clean slate)
        await pool.query(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE",
            [user.id]
        );

        // Generate tokens
        const accessToken = generateAccessToken({ id: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store hashed refresh token in DB
        await storeRefreshToken(user.id, refreshToken);

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Remove password from response
        delete user.password;

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user — revoke refresh token + clear cookies
 */
const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            // Find all active (non-revoked) refresh tokens for the user
            // We decode the JWT to get user_id, then revoke all their tokens
            try {
                const { verifyRefreshToken } = require("../utils/jwt.util");
                const decoded = verifyRefreshToken(token);

                // Revoke all refresh tokens for this user
                await pool.query(
                    "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE",
                    [decoded.id]
                );
            } catch {
                // Token invalid/expired — still clear cookies, just skip DB revocation
            }
        }

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Rotate refresh token — revoke old, issue new pair
 */
const refreshTokenHandler = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided",
            });
        }

        // Step 1: Verify JWT signature
        const { verifyRefreshToken } = require("../utils/jwt.util");
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }

        // Step 2: Find all active (non-revoked, non-expired) refresh tokens for this user
        const { rows: storedTokens } = await pool.query(
            `SELECT id, token, expires_at FROM refresh_tokens
             WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC`,
            [decoded.id]
        );

        if (storedTokens.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Refresh token has been revoked",
            });
        }

        // Step 3: Compare raw token against stored hashed tokens (find the matching one)
        let matchedTokenId = null;
        for (const stored of storedTokens) {
            const isMatch = await bcrypt.compare(token, stored.token);
            if (isMatch) {
                matchedTokenId = stored.id;
                break;
            }
        }

        if (!matchedTokenId) {
            // Possible token reuse attack — revoke ALL tokens for this user
            await pool.query(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1",
                [decoded.id]
            );

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");

            return res.status(401).json({
                success: false,
                message: "Token reuse detected. All sessions revoked for security",
            });
        }

        // Step 4: Revoke the old refresh token
        await pool.query(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1",
            [matchedTokenId]
        );

        // Step 5: Verify user still exists
        const { rows: userRows } = await pool.query(
            "SELECT id, role FROM users WHERE id = $1",
            [decoded.id]
        );

        if (userRows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists",
            });
        }

        const user = userRows[0];

        // Step 6: Issue new token pair (rotation)
        const newAccessToken = generateAccessToken({ id: user.id, role: user.role });
        const newRefreshToken = generateRefreshToken({ id: user.id });

        // Store new hashed refresh token
        await storeRefreshToken(user.id, newRefreshToken);

        // Set new cookies
        setAuthCookies(res, newAccessToken, newRefreshToken);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 */
const getMe = (req, res) => {
    res.status(200).json({
        success: true,
        data: { user: req.user },
    });
};

module.exports = { register, login, logout, refreshToken: refreshTokenHandler, getMe };
