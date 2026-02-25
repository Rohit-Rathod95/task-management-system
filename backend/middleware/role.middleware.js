/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Usage: authorizeRoles("ADMIN") or authorizeRoles("ADMIN", "MANAGER")
 * Must be used AFTER authenticate middleware (requires req.user)
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions",
            });
        }

        next();
    };
};

module.exports = { authorizeRoles };
