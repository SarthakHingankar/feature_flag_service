const { AppError } = require("./errors");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.code === "P2002") {
        return res.status(409).json({ error: "Resource already exists" });
    }

    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
