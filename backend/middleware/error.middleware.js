const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // PostgreSQL duplicate key violation (e.g. duplicate email)
    if (err.code === "23505") {
        statusCode = 409;
        message = "A record with this value already exists";
    }

    // PostgreSQL foreign key violation
    if (err.code === "23503") {
        statusCode = 400;
        message = "Referenced record does not exist";
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired";
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

module.exports = errorHandler;
