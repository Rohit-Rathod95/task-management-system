const { verifyAccessToken } = require("../utils/jwt.util");
const pool = require("../config/db");

/**
 * Authenticate — verifies JWT from httpOnly cookie and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided",
            });
        }

        const decoded = verifyAccessToken(token);

        // Verify user still exists in DB
        const { rows } = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists",
            });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

/**
 * Authorize — restricts access to specific roles
 * Usage: authorize("ADMIN") or authorize("USER", "ADMIN")
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action",
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
