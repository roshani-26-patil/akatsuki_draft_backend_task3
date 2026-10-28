import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';
import * as aiService from '../src/services/aiService.js';

process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long_for_security';
process.env.NODE_ENV = 'test';

describe('AI Content Improvement API', () => {
  const userId = '654321654321654321654321';
  const otherUserId = '654321654321654321654322';
  const userToken = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  const mockUser = {
    _id: userId,
    name: 'Shikamaru Nara',
    email: 'shikamaru@akatsuki.draft',
    role: 'user',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
  });

  it('should reject unauthenticated request with 401 Unauthorized', async () => {
    const postId = '654321654321654321654301';
    const response = await request(app).post(`/api/ai/improve/${postId}`);
    expect(response.status).toBe(401);
  });

  it('should reject AI improvement request on someone else post with 403 Forbidden', async () => {
    const postId = '654321654321654321654301';
    vi.spyOn(Post, 'findById').mockResolvedValue({
      _id: postId,
      title: 'Secret Scroll',
      createdBy: otherUserId, // Different user
    });

    const response = await request(app)
      .post(`/api/ai/improve/${postId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/forbidden/i);
  });

  it('should return 503 when AI service is not configured with an API key', async () => {
    const postId = '654321654321654321654301';
    vi.spyOn(Post, 'findById').mockResolvedValue({
      _id: postId,
      title: 'Shogi Strategy',
      description: 'Tactical analysis',
      content: 'A king piece needs ten moves ahead to prevent stalemate.',
      createdBy: userId,
    });

    vi.spyOn(aiService, 'improveContentWithAI').mockRejectedValue(
      new aiService.AIServiceError(
        'AI service is not configured. Please set a valid AI_API_KEY in your environment variables.',
        503
      )
    );

    const response = await request(app)
      .post(`/api/ai/improve/${postId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/AI service is not configured/i);
  });

  it('should improve content and create a NEW draft under the same user while preserving original post', async () => {
    const postId = '654321654321654321654301';
    const originalPost = {
      _id: postId,
      title: 'Draft Thinking Notes',
      description: 'Quick notes',
      content: 'Draft content that needs polish and grammatical improvement.',
      category: 'Strategy',
      createdBy: userId,
    };

    vi.spyOn(Post, 'findById').mockResolvedValue(originalPost);

    // Mock AI service to return polished content
    vi.spyOn(aiService, 'improveContentWithAI').mockResolvedValue({
      title: 'Polished Strategic Insights',
      description: 'Refined executive summary',
      content: 'Refined content meticulously edited for professional clarity and engagement.',
    });

    // Mock new draft creation
    let savedNewDraft = null;
    vi.spyOn(Post.prototype, 'save').mockImplementation(async function () {
      this._id = '654321654321654321654399';
      savedNewDraft = this;
      return this;
    });
    vi.spyOn(Post.prototype, 'populate').mockResolvedValue(true);

    const response = await request(app)
      .post(`/api/ai/improve/${postId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.originalPostId).toBe(postId);
    expect(savedNewDraft).toBeDefined();
    expect(savedNewDraft.status).toBe('draft');
    expect(savedNewDraft.title).toBe('Polished Strategic Insights');
    expect(savedNewDraft.content).toBe(
      'Refined content meticulously edited for professional clarity and engagement.'
    );
    expect(savedNewDraft.aiMetadata.isAiImproved).toBe(true);
    expect(savedNewDraft.aiMetadata.originalPostId.toString()).toBe(postId);

    // Guarantee the original post was not modified
    expect(originalPost.title).toBe('Draft Thinking Notes');
  });
});
