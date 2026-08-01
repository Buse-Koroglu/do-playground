class AppError extends Error {
  constructor(message, statusCode, name, details) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", details) {
    super(message, 400, "ValidationError", details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AuthenticationError");
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "AuthorizationError");
  }
}

class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NotFoundError");
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
};