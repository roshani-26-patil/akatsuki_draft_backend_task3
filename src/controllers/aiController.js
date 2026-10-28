import mongoose from 'mongoose';
import Post from '../models/Post.js';
import { improveContentWithAI, AIServiceError } from '../services/aiService.js';

/**
 * Improve an existing post's content using AI and save as a new draft
 * POST /api/ai/improve/:postId
 */
export const improvePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format',
        errors: [{ field: 'postId', message: `'${postId}' is not a valid MongoDB ObjectId` }],
      });
    }

    // Retrieve the original post
    const originalPost = await Post.findById(postId);

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        errors: [{ message: `No post found with ID '${postId}'` }],
      });
    }

    // Ownership check: only the author can request AI improvement for their post
    if (originalPost.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this post.',
        errors: [{ message: 'You can only request AI improvement for posts you authored' }],
      });
    }

    // Call the AI improvement service with the original post content
    const improvedData = await improveContentWithAI({
      title: originalPost.title,
      description: originalPost.description,
      content: originalPost.content,
    });

    // Create a NEW draft with the improved content while preserving original post intact
    const improvedDraft = new Post({
      title: improvedData.title,
      description: improvedData.description,
      content: improvedData.content,
      image: originalPost.image || '',
      category: originalPost.category || 'General',
      createdBy: req.user._id,
      status: 'draft',
      aiMetadata: {
        isAiImproved: true,
        originalPostId: originalPost._id,
        originalTitle: originalPost.title,
        improvedAt: new Date(),
      },
    });

    await improvedDraft.save();
    await improvedDraft.populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Post content improved successfully and saved as a new draft',
      data: {
        originalPostId: originalPost._id,
        improvedDraft,
      },
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        errors: [{ message: error.message }],
      });
    }
    next(error);
  }
};
