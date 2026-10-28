/**
 * Not Found Handler (404)
 * Handles any request sent to unmapped routes.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errors: [{ message: 'The requested endpoint does not exist' }],
  });
};

/**
 * Centralized Error Handling Middleware
 * Catches all errors from async handlers and custom thrown exceptions.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
    errors = [{ field: err.path, message: `Value '${err.value}' is not a valid ObjectId` }];
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate entry for ${duplicatedField}`;
    errors = [{ field: duplicatedField, message: `${duplicatedField} '${err.keyValue[duplicatedField]}' already exists` }];
  }

  // JWT Token Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errors = [{ message: err.message }];
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    errors = [{ message: 'Token has expired' }];
  }

  // Response payload
  const responsePayload = {
    success: false,
    message,
    errors: errors.length > 0 ? errors : [{ message }],
  };

  // Only include stack trace in development mode for debugging
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

export default errorHandler;
