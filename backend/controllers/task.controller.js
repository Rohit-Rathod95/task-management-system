const pool = require("../config/db");
const { encrypt, decrypt } = require("../utils/encryption");

/**
 * Helper: Decrypt description field in a task object
 */
const decryptTask = (task) => {
    if (task && task.description) {
        task.description = decrypt(task.description);
    }
    return task;
};

/**
 * Helper: Decrypt description in an array of tasks
 */
const decryptTasks = (tasks) => tasks.map(decryptTask);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 */
const createTask = async (req, res, next) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Title is required",
            });
        }

        // Encrypt description before storing
        const encryptedDescription = description ? encrypt(description) : null;

        const { rows } = await pool.query(
            `INSERT INTO tasks (title, description, user_id)
             VALUES ($1, $2, $3)
             RETURNING id, title, description, status, user_id, created_at`,
            [title, encryptedDescription, req.user.id]
        );

        // Decrypt before sending response
        decryptTask(rows[0]);

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: { task: rows[0] },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for authenticated user
 * @query   page (default 1), limit (default 10), status, search
 */
const getTasks = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
        const offset = (page - 1) * limit;
        const { status, search } = req.query;

        // Build WHERE clause dynamically
        const conditions = ["user_id = $1", "deleted_at IS NULL"];
        const values = [req.user.id];
        let paramIndex = 2;

        // Filter by status
        if (status) {
            const validStatuses = ["pending", "in-progress", "completed"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Status must be one of: ${validStatuses.join(", ")}`,
                });
            }
            conditions.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        // Search by title (title is NOT encrypted, so ILIKE works fine)
        if (search) {
            conditions.push(`title ILIKE $${paramIndex}`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.join(" AND ");

        // Get total count for pagination metadata
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM tasks WHERE ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        // Get paginated results
        const { rows } = await pool.query(
            `SELECT id, title, description, status, created_at
             FROM tasks
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...values, limit, offset]
        );

        // Decrypt descriptions before sending
        decryptTasks(rows);

        res.status(200).json({
            success: true,
            data: {
                tasks: rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 */
const getTaskById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `SELECT id, title, description, status, created_at
             FROM tasks
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        // Decrypt description before sending
        decryptTask(rows[0]);

        res.status(200).json({
            success: true,
            data: { task: rows[0] },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 */
const updateTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, status } = req.body;

        // Validate status if provided
        const validStatuses = ["pending", "in-progress", "completed"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(", ")}`,
            });
        }

        // Check task exists and belongs to user
        const existing = await pool.query(
            "SELECT id FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
            [id, req.user.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        // Encrypt description if provided
        const encryptedDescription = description ? encrypt(description) : null;

        const { rows } = await pool.query(
            `UPDATE tasks
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 status = COALESCE($3, status)
             WHERE id = $4 AND user_id = $5
             RETURNING id, title, description, status, created_at`,
            [title || null, encryptedDescription, status || null, id, req.user.id]
        );

        // Decrypt before sending response
        decryptTask(rows[0]);

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: { task: rows[0] },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Soft delete a task
 */
const deleteTask = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE tasks SET deleted_at = NOW()
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Task deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
