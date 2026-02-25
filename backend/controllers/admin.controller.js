const pool = require("../config/db");
const { decrypt } = require("../utils/encryption");

/**
 * Helper: Decrypt description field in task objects
 */
const decryptTask = (task) => {
    if (task && task.description) {
        task.description = decrypt(task.description);
    }
    return task;
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (ADMIN only)
 */
const getAllUsers = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, email, role, created_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.status(200).json({
            success: true,
            data: { users: rows, count: rows.length },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all tasks across all users (ADMIN only, paginated)
 * @query   page (default 1), limit (default 10), status
 */
const getAllTasks = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
        const offset = (page - 1) * limit;
        const { status } = req.query;

        // Build WHERE clause
        const conditions = ["t.deleted_at IS NULL"];
        const values = [];
        let paramIndex = 1;

        if (status) {
            const validStatuses = ["pending", "in-progress", "completed"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Status must be one of: ${validStatuses.join(", ")}`,
                });
            }
            conditions.push(`t.status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        const whereClause = conditions.join(" AND ");

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM tasks t WHERE ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        // Get paginated results with user info
        const { rows } = await pool.query(
            `SELECT t.id, t.title, t.description, t.status, t.user_id,
                    t.created_at, u.name AS user_name, u.email AS user_email
             FROM tasks t
             JOIN users u ON t.user_id = u.id
             WHERE ${whereClause}
             ORDER BY t.created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...values, limit, offset]
        );

        // Decrypt descriptions before sending
        rows.forEach(decryptTask);

        res.status(200).json({
            success: true,
            data: {
                tasks: rows,
                pagination: { total, page, limit, totalPages },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/admin/tasks/:id
 * @desc    Soft delete any task (ADMIN only, no ownership check)
 */
const deleteAnyTask = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE tasks SET deleted_at = NOW()
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id, title`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `Task "${rows[0].title}" deleted by admin`,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update a user's role (ADMIN only)
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        const validRoles = ["USER", "ADMIN"];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Role must be one of: ${validRoles.join(", ")}`,
            });
        }

        // Prevent admin from changing their own role
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role",
            });
        }

        const { rows } = await pool.query(
            `UPDATE users SET role = $1
             WHERE id = $2
             RETURNING id, name, email, role`,
            [role, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `User role updated to ${role}`,
            data: { user: rows[0] },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllUsers, getAllTasks, deleteAnyTask, updateUserRole };
