import express from 'express';
import { param, body } from 'express-validator';
import {
  getPendingPosts,
  approvePost,
  rejectPost,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Enforce both authentication and administrator role for all routes in this router
router.use(authenticate, requireAdmin);

// Validation for id parameter
const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid post ID parameter'),
  validateRequest,
];

// Validation for rejection
const rejectValidation = [
  param('id').isMongoId().withMessage('Invalid post ID parameter'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason cannot exceed 1000 characters'),
  validateRequest,
];

// Admin Routes
router.get('/posts/pending', getPendingPosts);
router.patch('/posts/approve/:id', idParamValidation, approvePost);
router.patch('/posts/reject/:id', rejectValidation, rejectPost);

export default router;
