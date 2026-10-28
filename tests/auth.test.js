import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';

process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long_for_security';
process.env.NODE_ENV = 'test';

describe('Authentication API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and assign "user" role', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(User.prototype, 'save').mockImplementation(async function () {
        this._id = '654321654321654321654321';
        this.createdAt = new Date();
        this.updatedAt = new Date();
        return this;
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Naruto Uzumaki',
          email: 'naruto@akatsuki.draft',
          password: 'Dattebayo123!',
          role: 'admin', // Should be ignored; role must default to 'user'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('naruto@akatsuki.draft');
      expect(response.body.data.user.role).toBe('user'); // Enforce role safety
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject registration if email is already taken with 409 Conflict', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue({
        _id: '654321654321654321654321',
        email: 'naruto@akatsuki.draft',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Naruto Clone',
          email: 'naruto@akatsuki.draft',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already registered/i);
    });

    it('should fail with 400 Bad Request when missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user and return a signed JWT', async () => {
      const mockUser = {
        _id: '654321654321654321654321',
        name: 'Sasuke Uchiha',
        email: 'sasuke@akatsuki.draft',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        comparePassword: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sasuke@akatsuki.draft',
          password: 'Chidori123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('sasuke@akatsuki.draft');
    });

    it('should return 401 Unauthorized for incorrect password without leaking info', async () => {
      const mockUser = {
        _id: '654321654321654321654321',
        email: 'sasuke@akatsuki.draft',
        comparePassword: vi.fn().mockResolvedValue(false),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sasuke@akatsuki.draft',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should return 401 Unauthorized for non-existent user email', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@akatsuki.draft',
          password: 'AnyPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the current user profile when valid token is supplied', async () => {
      const userId = '654321654321654321654321';
      const token = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      const mockUser = {
        _id: userId,
        name: 'Kakashi Hatake',
        email: 'kakashi@akatsuki.draft',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Kakashi Hatake');
      expect(response.body.data.user.email).toBe('kakashi@akatsuki.draft');
    });

    it('should reject request without token with 401 Unauthorized', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
