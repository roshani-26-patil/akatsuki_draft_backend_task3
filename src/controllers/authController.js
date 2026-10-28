import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Helper to generate JWT token
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Helper to format safe user response (excludes password hash)
 */
const formatSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        errors: [{ field: 'email', message: 'An account with this email address already exists' }],
      });
    }

    // Role is strictly forced to 'user' on public registration for security
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'user',
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatSafeUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    // Explicitly select password field since it is omitted by default in the schema
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [{ message: 'The credentials provided do not match our records' }],
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [{ message: 'The credentials provided do not match our records' }],
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatSafeUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user's profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is attached by authMiddleware
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: {
        user: formatSafeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};
