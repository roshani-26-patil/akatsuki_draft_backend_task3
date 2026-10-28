import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';

process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long_for_security';
process.env.NODE_ENV = 'test';

describe('Posts API', () => {
  const userId = '654321654321654321654321';
  const otherUserId = '654321654321654321654322';
  const userToken = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  const mockUser = {
    _id: userId,
    name: 'Jiraiya Sensei',
    email: 'jiraiya@akatsuki.draft',
    role: 'user',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
  });

  describe('POST /api/posts', () => {
    it('should create a draft by default', async () => {
      vi.spyOn(Post.prototype, 'save').mockImplementation(async function () {
        this._id = '654321654321654321654399';
        return this;
      });
      vi.spyOn(Post.prototype, 'populate').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'The Tale of the Utterly Gutsy Shinobi',
          description: 'A story of unwavering resolve.',
          content: 'A shinobi is one who endures no matter what the world casts their way.',
          category: 'Literature',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.post.status).toBe('draft');
      expect(response.body.message).toMatch(/draft saved/i);
    });

    it('should allow user to submit post directly for pending approval', async () => {
      vi.spyOn(Post.prototype, 'save').mockImplementation(async function () {
        this._id = '654321654321654321654399';
        return this;
      });
      vi.spyOn(Post.prototype, 'populate').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'The Tale of the Utterly Gutsy Shinobi',
          content: 'A shinobi is one who endures no matter what the world casts their way.',
          status: 'pending',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.post.status).toBe('pending');
      expect(response.body.message).toMatch(/submitted for administrator approval/i);
    });

    it('should strictly reject normal users trying to set status to "approved"', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Self-Approved Post Bypass',
          content: 'This should be blocked immediately by validation and controller.',
          status: 'approved',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/posts/my-posts', () => {
    it('should fetch only posts created by the authenticated user', async () => {
      const mockPosts = [
        {
          _id: '654321654321654321654301',
          title: 'My Draft 1',
          status: 'draft',
          createdBy: userId,
        },
      ];

      vi.spyOn(Post, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockPosts),
      });
      vi.spyOn(Post, 'countDocuments').mockResolvedValue(1);

      const response = await request(app)
        .get('/api/posts/my-posts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('PATCH /api/posts/:id', () => {
    it('should reject unauthorized update when post belongs to someone else', async () => {
      const postId = '654321654321654321654301';
      vi.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        title: 'Original Title',
        createdBy: otherUserId, // Not matching user!
      });

      const response = await request(app)
        .patch(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacked Title' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/forbidden/i);
    });

    it('should revert status to pending/draft if an approved post content is modified', async () => {
      const postId = '654321654321654321654301';
      const existingApprovedPost = {
        _id: postId,
        title: 'Original Approved Title',
        content: 'Original approved content text here.',
        status: 'approved',
        createdBy: userId,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Post, 'findById').mockResolvedValue(existingApprovedPost);

      const response = await request(app)
        .patch(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Modified Approved Title Now Needs Review',
        });

      expect(response.status).toBe(200);
      expect(existingApprovedPost.status).toBe('pending'); // Reverted from approved for safety!
      expect(response.body.message).toMatch(/resubmitted for admin approval/i);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should allow user to delete their own post', async () => {
      const postId = '654321654321654321654301';
      vi.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        createdBy: userId,
      });
      vi.spyOn(Post, 'findByIdAndDelete').mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deleted successfully/i);
    });

    it('should block deleting another user post with 403 Forbidden', async () => {
      const postId = '654321654321654321654301';
      vi.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        createdBy: otherUserId,
      });

      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Public Post Exploration (GET /api/posts)', () => {
    it('should only return approved posts to the public', async () => {
      const approvedPosts = [
        {
          _id: '654321654321654321654301',
          title: 'Public Masterpiece',
          status: 'approved',
        },
      ];

      vi.spyOn(Post, 'find').mockImplementation((filter) => {
        expect(filter.status).toBe('approved'); // Guarantee only approved filter
        return {
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          populate: vi.fn().mockResolvedValue(approvedPosts),
        };
      });
      vi.spyOn(Post, 'countDocuments').mockResolvedValue(1);

      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posts[0].status).toBe('approved');
    });

    it('should return 404 for unapproved post on public single post endpoint', async () => {
      const postId = '654321654321654321654301';
      vi.spyOn(Post, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(null), // Post not found with status: approved
      });

      const response = await request(app).get(`/api/posts/${postId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found or not approved/i);
    });
  });
});
