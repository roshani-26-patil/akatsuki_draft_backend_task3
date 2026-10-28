/**
 * Admin Authorization Middleware
 * Ensures the authenticated user has the 'admin' role directly verified against the database.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required before checking administrator privileges',
      errors: [{ message: 'No authenticated user attached to request' }],
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Administrator privileges required.',
      errors: [{ message: `User role '${req.user.role}' is not authorized to access this resource` }],
    });
  }

  next();
};

export default requireAdmin;
