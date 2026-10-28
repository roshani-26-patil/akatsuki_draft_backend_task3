import mongoose from 'mongoose';
import Post from '../models/Post.js';

/**
 * Get all posts waiting for administrator approval
 * GET /api/admin/posts/pending
 */
export const getPendingPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { status: 'pending' };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email role'),
      Post.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Pending posts fetched successfully',
      data: {
        posts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending post
 * PATCH /api/admin/posts/approve/:id
 */
export const approvePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'id', message: `'${id}' is not a valid MongoDB ObjectId` }],
      });
    }

    const post = await Post.findById(id).populate('createdBy', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        errors: [{ message: `No post found with ID '${id}'` }],
      });
    }

    if (post.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Post cannot be approved',
        errors: [
          {
            field: 'status',
            message: `Only pending posts can be approved. This post has status '${post.status}'.`,
          },
        ],
      });
    }

    post.status = 'approved';
    post.rejectionReason = null;
    await post.save();

    return res.status(200).json({
      success: true,
      message: 'Post approved successfully and is now publicly visible',
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending post
 * PATCH /api/admin/posts/reject/:id
 */
export const rejectPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'id', message: `'${id}' is not a valid MongoDB ObjectId` }],
      });
    }

    const post = await Post.findById(id).populate('createdBy', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        errors: [{ message: `No post found with ID '${id}'` }],
      });
    }

    if (post.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Post cannot be rejected',
        errors: [
          {
            field: 'status',
            message: `Only pending posts can be rejected. This post has status '${post.status}'.`,
          },
        ],
      });
    }

    post.status = 'rejected';
    post.rejectionReason = rejectionReason
      ? rejectionReason.trim()
      : 'Content does not meet editorial quality or publishing guidelines.';
    await post.save();

    return res.status(200).json({
      success: true,
      message: 'Post rejected successfully',
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};
