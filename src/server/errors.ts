export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class PermissionError extends AppError {
  constructor(message = "Access denied") {
    super("PERMISSION_DENIED", message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("VALIDATION_FAILED", "Invalid input", 422, details);
  }
}
