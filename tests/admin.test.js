import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';

process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long_for_security';
process.env.NODE_ENV = 'test';

describe('Admin Approval Workflow API', () => {
  const adminId = '654321654321654321654388';
  const regularUserId = '654321654321654321654399';

  const adminToken = jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  const userToken = jwt.sign({ id: regularUserId, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  const mockAdminUser = {
    _id: adminId,
    name: 'Tsunade Senju',
    email: 'tsunade@akatsuki.draft',
    role: 'admin',
  };

  const mockRegularUser = {
    _id: regularUserId,
    name: 'Kiba Inuzuka',
    email: 'kiba@akatsuki.draft',
    role: 'user',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/posts/pending', () => {
    it('should forbid regular users with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockRegularUser),
      });

      const response = await request(app)
        .get('/api/admin/posts/pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/administrator privileges required/i);
    });

    it('should allow administrators to fetch all pending posts', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminUser),
      });

      const mockPendingPosts = [
        {
          _id: '654321654321654321654311',
          title: 'Pending Submission',
          status: 'pending',
          createdBy: { name: 'Kiba Inuzuka', email: 'kiba@akatsuki.draft' },
        },
      ];

      vi.spyOn(Post, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockPendingPosts),
      });
      vi.spyOn(Post, 'countDocuments').mockResolvedValue(1);

      const response = await request(app)
        .get('/api/admin/posts/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posts[0].status).toBe('pending');
    });
  });

  describe('PATCH /api/admin/posts/approve/:id', () => {
    it('should approve a pending post and clear previous rejection reasons', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminUser),
      });

      const postId = '654321654321654321654311';
      const mockPost = {
        _id: postId,
        title: 'Ready for Publication',
        status: 'pending',
        rejectionReason: 'Previous issue',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Post, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockPost),
      });

      const response = await request(app)
        .patch(`/api/admin/posts/approve/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPost.status).toBe('approved');
      expect(mockPost.rejectionReason).toBeNull();
      expect(response.body.message).toMatch(/approved successfully/i);
    });

    it('should reject approving a post that is not in pending status', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminUser),
      });

      const postId = '654321654321654321654311';
      const mockPost = {
        _id: postId,
        title: 'Draft Post',
        status: 'draft', // Not pending!
      };

      vi.spyOn(Post, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockPost),
      });

      const response = await request(app)
        .patch(`/api/admin/posts/approve/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cannot be approved/i);
    });
  });

  describe('PATCH /api/admin/posts/reject/:id', () => {
    it('should reject a pending post and record the administrator rejection reason', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminUser),
      });

      const postId = '654321654321654321654311';
      const mockPost = {
        _id: postId,
        title: 'Subpar Article',
        status: 'pending',
        rejectionReason: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Post, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockPost),
      });

      const response = await request(app)
        .patch(`/api/admin/posts/reject/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'The article lacks supporting citations and depth.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPost.status).toBe('rejected');
      expect(mockPost.rejectionReason).toBe('The article lacks supporting citations and depth.');
      expect(response.body.message).toMatch(/rejected successfully/i);
    });
  });
});
