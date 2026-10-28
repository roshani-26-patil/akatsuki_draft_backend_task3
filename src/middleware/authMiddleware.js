import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Validates the JWT Bearer token, checks expiration, and retrieves the current user from the database.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
        errors: [{ message: 'Missing or malformed Authorization header' }],
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Token missing.',
        errors: [{ message: 'Token not found after Bearer prefix' }],
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Security Warning] JWT_SECRET is not configured in environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Internal server configuration error',
        errors: [{ message: 'JWT_SECRET is missing from server configuration' }],
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
          errors: [{ message: 'Token expired at ' + jwtError.expiredAt }],
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        errors: [{ message: 'Token verification failed: ' + jwtError.message }],
      });
    }

    // Verify user still exists in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists or was deleted',
        errors: [{ message: 'Account revoked or not found' }],
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
