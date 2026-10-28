import mongoose from 'mongoose';
import Post from '../models/Post.js';

/**
 * Create a new post or draft
 * POST /api/posts
 */
export const createPost = async (req, res, next) => {
  try {
    const { title, description, content, image, category, status } = req.body;

    // Validate allowed status values for normal users
    const validStatuses = ['draft', 'pending'];
    const chosenStatus = status || 'draft';

    if (!validStatuses.includes(chosenStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post status',
        errors: [
          {
            field: 'status',
            message: `Users can only set status to 'draft' or 'pending'. Received: '${chosenStatus}'`,
          },
        ],
      });
    }

    const post = new Post({
      title: title.trim(),
      description: description ? description.trim() : '',
      content: content.trim(),
      image: image ? image.trim() : '',
      category: category ? category.trim() : 'General',
      createdBy: req.user._id,
      status: chosenStatus,
    });

    await post.save();

    await post.populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message:
        chosenStatus === 'pending'
          ? 'Post submitted for administrator approval'
          : 'Draft saved successfully',
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's posts (drafts, pending, approved, rejected)
 * GET /api/posts/my-posts
 */
export const getMyPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { createdBy: req.user._id };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Post.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: 'My posts retrieved successfully',
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
 * Update an existing post owned by the current user
 * PATCH /api/posts/:id
 */
export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'id', message: `'${id}' is not a valid MongoDB ObjectId` }],
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        errors: [{ message: `No post found with ID '${id}'` }],
      });
    }

    // Ownership verification
    if (post.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this post.',
        errors: [{ message: 'You are not authorized to modify another user\'s post' }],
      });
    }

    const { title, description, content, image, category, status } = req.body;

    // Validate requested status
    if (status !== undefined) {
      const allowedStatuses = ['draft', 'pending'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post status update',
          errors: [
            {
              field: 'status',
              message: `You can only set status to 'draft' or 'pending'. Users cannot set 'approved' or 'rejected'.`,
            },
          ],
        });
      }
    }

    // Check if post was previously approved and core content is being modified
    const wasApproved = post.status === 'approved';
    const isChangingContent =
      (title !== undefined && title.trim() !== post.title) ||
      (description !== undefined && description.trim() !== post.description) ||
      (content !== undefined && content.trim() !== post.content) ||
      (image !== undefined && image.trim() !== post.image) ||
      (category !== undefined && category.trim() !== post.category);

    if (title !== undefined) post.title = title.trim();
    if (description !== undefined) post.description = description.trim();
    if (content !== undefined) post.content = content.trim();
    if (image !== undefined) post.image = image.trim();
    if (category !== undefined) post.category = category.trim();

    // If an approved post is edited, it must not remain publicly live without review.
    // Automatically revert status to 'pending' (or 'draft' if user requested draft).
    if (wasApproved && isChangingContent) {
      post.status = status === 'draft' ? 'draft' : 'pending';
      post.rejectionReason = null;
    } else if (status !== undefined) {
      post.status = status;
      if (status === 'pending') {
        post.rejectionReason = null;
      }
    }

    await post.save();
    await post.populate('createdBy', 'name email');

    let updateMessage = 'Post updated successfully';
    if (wasApproved && isChangingContent) {
      updateMessage =
        post.status === 'pending'
          ? 'Approved post was modified and resubmitted for admin approval'
          : 'Approved post was modified and saved as a draft';
    }

    return res.status(200).json({
      success: true,
      message: updateMessage,
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a post owned by the current user
 * DELETE /api/posts/:id
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'id', message: `'${id}' is not a valid MongoDB ObjectId` }],
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        errors: [{ message: `No post found with ID '${id}'` }],
      });
    }

    if (post.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this post.',
        errors: [{ message: 'You are not authorized to delete another user\'s post' }],
      });
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Explore approved posts
 * GET /api/posts
 */
export const getPublicPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Strictly enforce approved status only for public exploration
    const filter = { status: 'approved' };

    // Filter by category
    if (req.query.category && req.query.category.trim() !== '') {
      filter.category = new RegExp(`^${req.query.category.trim()}$`, 'i');
    }

    // Search query on title, description, or content
    if (req.query.search && req.query.search.trim() !== '') {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { content: searchRegex },
      ];
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name'),
      Post.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Approved posts fetched successfully',
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
 * Public: Get a single approved post
 * GET /api/posts/:id
 */
export const getPublicPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'id', message: `'${id}' is not a valid MongoDB ObjectId` }],
      });
    }

    const post = await Post.findOne({ _id: id, status: 'approved' }).populate(
      'createdBy',
      'name'
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or not approved',
        errors: [{ message: 'No approved post found matching this identifier' }],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Post fetched successfully',
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};
