const { AppError } = require("../errors");

/**
 * Centralised Express error handler.
 *
 * Mapping rules (order matters):
 *  1. Domain errors (AppError subclasses) → use their statusCode + message.
 *  2. Prisma unique-constraint violation (P2002) → 409.
 *  3. Everything else → 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
    // 1. Domain errors thrown by the service / controller layer
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    // 2. Prisma unique-constraint violation
    if (err.code === "P2002") {
        return res.status(409).json({ error: "Resource already exists" });
    }

    // 3. Unexpected errors — log and return generic 500
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
