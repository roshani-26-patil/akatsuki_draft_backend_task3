import express from 'express';
import { param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { improvePost } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Specific rate limiting for AI operations to prevent quota exhaustion and abuse
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  message: {
    success: false,
    message: 'Too many AI improvement requests. Please wait before making further requests.',
    errors: [{ message: 'Rate limit exceeded for AI services' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const validatePostId = [
  param('postId').isMongoId().withMessage('Invalid post ID parameter'),
  validateRequest,
];

// Improve post content using AI
router.post('/improve/:postId', authenticate, aiRateLimiter, validatePostId, improvePost);

export default router;
