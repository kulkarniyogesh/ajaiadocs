import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ---------------------------------------------------------------------------
// Typed application error classes
// ---------------------------------------------------------------------------

/**
 * Thrown when authentication fails (bad credentials, expired/revoked token).
 * Maps to HTTP 401.
 */
export class AuthError extends Error {
  readonly statusCode = 401;

  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
    // Maintain correct prototype chain in environments that transpile classes.
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Thrown when a user attempts to access a resource they are not authorised
 * to touch (wrong owner, missing access grant, insufficient permissions).
 * Maps to HTTP 403.
 */
export class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Thrown when a requested resource does not exist in the database.
 * Maps to HTTP 404.
 */
export class NotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when request input fails domain validation (blank title, bad file
 * type, self-share, etc.).
 * Maps to HTTP 422.
 */
export class ValidationError extends Error {
  readonly statusCode = 422;

  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Typed union for recognised application errors
// ---------------------------------------------------------------------------

type AppError = AuthError | ForbiddenError | NotFoundError | ValidationError;

function isAppError(err: unknown): err is AppError {
  return (
    err instanceof AuthError ||
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof ValidationError
  );
}

// ---------------------------------------------------------------------------
// asyncHandler — wraps an async Express route handler so that any thrown
// error (or rejected promise) is forwarded to the next() error middleware
// instead of leaving the promise unhandled.
// ---------------------------------------------------------------------------

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ---------------------------------------------------------------------------
// Global error middleware — must be registered last in Express with four
// parameters so Express recognises it as an error handler.
// ---------------------------------------------------------------------------

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Unhandled / unexpected errors — never expose internals or stack traces.
  res.status(500).json({ message: 'An unexpected error occurred.' });
}
