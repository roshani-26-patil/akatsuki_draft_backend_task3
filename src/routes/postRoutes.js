import express from 'express';
import { body, param } from 'express-validator';
import {
  createPost,
  getMyPosts,
  updatePost,
  deletePost,
  getPublicPosts,
  getPublicPostById,
} from '../controllers/postController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Validation for post creation
const createPostValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters long'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be between 10 and 50,000 characters long'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('image')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'pending'])
    .withMessage("Status must be either 'draft' or 'pending'"),
  validateRequest,
];

// Validation for post updates
const updatePostValidation = [
  param('id').isMongoId().withMessage('Invalid post ID parameter'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters long'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Content cannot be empty')
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be between 10 and 50,000 characters long'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('image')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'pending'])
    .withMessage("Status must be either 'draft' or 'pending'"),
  validateRequest,
];

const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid post ID parameter'),
  validateRequest,
];

// -------------------------------------------------------------
// Authenticated user post management routes
// -------------------------------------------------------------
// Note: Define '/my-posts' BEFORE '/:id' to prevent route collision
router.get('/my-posts', authenticate, getMyPosts);
router.post('/', authenticate, createPostValidation, createPost);
router.patch('/:id', authenticate, updatePostValidation, updatePost);
router.delete('/:id', authenticate, idParamValidation, deletePost);

// -------------------------------------------------------------
// Public post exploration routes (Approved posts only)
// -------------------------------------------------------------
router.get('/', getPublicPosts);
router.get('/:id', idParamValidation, getPublicPostById);

export default router;
