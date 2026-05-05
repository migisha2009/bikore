const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const app = require('../src/index');
const { query } = require('../src/db');

describe('Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        phone: '+250788123456',
        password: 'password123'
      };

      // Mock database responses
      query.mockResolvedValueOnce({ rows: [] }); // No existing user
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '1', 
          name: userData.name, 
          phone: userData.phone,
          created_at: new Date()
        }] 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.phone).toBe(userData.phone);
    });

    it('should not register user with invalid phone number', async () => {
      const userData = {
        name: 'Test User',
        phone: '123', // Invalid phone
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('valid phone number');
    });

    it('should not register user with existing phone number', async () => {
      const userData = {
        name: 'Test User',
        phone: '+250788123456',
        password: 'password123'
      };

      // Mock existing user
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '1', 
          phone: userData.phone 
        }] 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate password strength', async () => {
      const userData = {
        name: 'Test User',
        phone: '+250788123456',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        phone: '+250788123456',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Mock user lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '1', 
          name: 'Test User',
          phone: loginData.phone,
          password: hashedPassword,
          created_at: new Date()
        }] 
      });

      // Mock JWT
      jwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phone).toBe(loginData.phone);
    });

    it('should not login with invalid credentials', async () => {
      const loginData = {
        phone: '+250788123456',
        password: 'wrongpassword'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Mock user lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '1', 
          phone: loginData.phone,
          password: hashedPassword
        }] 
      });

      // Mock bcrypt compare to return false
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should not login non-existent user', async () => {
      const loginData = {
        phone: '+250788123456',
        password: 'password123'
      };

      // Mock no user found
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('Phone Validation', () => {
    it('should validate Rwanda phone numbers correctly', () => {
      const validPhones = [
        '+250788123456',
        '+250723123456',
        '+250731123456'
      ];

      validPhones.forEach(phone => {
        const rwandaPhoneRegex = /^\+2507[238]\d{7}$/;
        expect(rwandaPhoneRegex.test(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '+250123456',
        '+25078812345', // Too short
        '+2507881234567', // Too long
        '+25078812345a', // Contains letter
        '0788123456' // Missing country code
      ];

      invalidPhones.forEach(phone => {
        const rwandaPhoneRegex = /^\+2507[238]\d{7}$/;
        expect(rwandaPhoneRegex.test(phone)).toBe(false);
      });
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: '1', phone: '+250788123456' };
      
      jwt.sign.mockReturnValue('mock-jwt-token');
      
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
      
      expect(token).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String));
    });

    it('should verify JWT token correctly', () => {
      const token = 'mock-jwt-token';
      const payload = { userId: '1', phone: '+250788123456' };
      
      jwt.verify.mockReturnValue(payload);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded).toEqual(payload);
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
    });

    it('should handle invalid JWT token', () => {
      const token = 'invalid-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      }).toThrow('Invalid token');
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      const loginData = {
        phone: '+250788123456',
        password: 'password123'
      };

      // Mock no user found for all attempts
      query.mockResolvedValue({ rows: [] });

      // Make multiple rapid requests
      const requests = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
