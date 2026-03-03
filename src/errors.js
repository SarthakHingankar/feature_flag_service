class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super(message, 404);
    }
}

class ValidationError extends AppError {
    constructor(message = "Invalid input") {
        super(message, 400);
    }
}

class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}

module.exports = { AppError, NotFoundError, ValidationError, ConflictError };
