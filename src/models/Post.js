import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [10, 'Content must be at least 10 characters long'],
      maxlength: [50000, 'Content cannot exceed 50,000 characters'],
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author (createdBy) is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
      default: null,
    },
    aiMetadata: {
      isAiImproved: {
        type: Boolean,
        default: false,
      },
      originalPostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null,
      },
      originalTitle: {
        type: String,
        default: null,
      },
      improvedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound and text indexes for fast queries and search
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ createdBy: 1, status: 1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
});

const Post = mongoose.model('Post', postSchema);

export default Post;
