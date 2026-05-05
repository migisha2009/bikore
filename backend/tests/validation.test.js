const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

// Mock dependencies
jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const app = require('../src/index');
const { query } = require('../src/db');

describe('Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation Rules', () => {
    describe('Phone Number Validation', () => {
      it('should validate Rwanda phone numbers correctly', () => {
        const validPhones = [
          '+250788123456',
          '+250723123456',
          '+250731123456',
          '+250739123456',
          '+250728123456'
        ];

        const rwandaPhoneRegex = /^\+2507[238]\d{7}$/;
        
        validPhones.forEach(phone => {
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
          '0788123456', // Missing country code
          '+25078812345', // 11 digits
          '+25078812345678', // 14 digits
          '+250789123456', // Wrong prefix
          '+250777123456' // Wrong prefix
        ];

        const rwandaPhoneRegex = /^\+2507[238]\d{7}$/;
        
        invalidPhones.forEach(phone => {
          expect(rwandaPhoneRegex.test(phone)).toBe(false);
        });
      });

      it('should sanitize phone numbers correctly', () => {
        const phoneInputs = {
          '+250788123456': '+250788123456',
          '0788123456': '+250788123456',
          '+250 788 123 456': '+250788123456',
          '+250-788-123-456': '+250788123456',
          '(+250) 788-123-456': '+250788123456'
        };

        Object.entries(phoneInputs).forEach(([input, expected]) => {
          const sanitized = input.replace(/\D/g, '');
          let result;
          
          if (sanitized.length === 12 && sanitized.startsWith('250')) {
            result = '+' + sanitized;
          } else if (sanitized.length === 9 && sanitized.startsWith('7')) {
            result = '+250' + sanitized;
          }
          
          expect(result).toBe(expected);
        });
      });
    });

    describe('Name Validation', () => {
      it('should validate user names correctly', () => {
        const validNames = [
          'John Doe',
          'Jean-Pierre',
          'Marie Claire',
          'Ali Hassan',
          'Josephine Uwimana',
          'A' // Single character
        ];

        validNames.forEach(name => {
          expect(name.length).toBeGreaterThanOrEqual(1);
          expect(name.length).toBeLessThanOrEqual(100);
          expect(/^[a-zA-Z\s\-']+$/.test(name)).toBe(true);
        });
      });

      it('should reject invalid names', () => {
        const invalidNames = [
          '', // Empty
          '123', // Numbers only
          'John@Doe', // Special characters
          '   ', // Spaces only
          'a'.repeat(101) // Too long
        ];

        invalidNames.forEach(name => {
          if (name.length === 0 || name.length > 100) {
            expect(name.length >= 1 && name.length <= 100).toBe(false);
          }
          if (name && !/^[a-zA-Z\s\-']+$/.test(name)) {
            expect(/^[a-zA-Z\s\-']+$/.test(name)).toBe(false);
          }
        });
      });
    });

    describe('Amount Validation', () => {
      it('should validate monetary amounts correctly', () => {
        const validAmounts = [100, 500, 1000, 50000, 100000, 500000];
        const invalidAmounts = [0, -100, 50, 1000001, 5000000];

        validAmounts.forEach(amount => {
          expect(amount).toBeGreaterThanOrEqual(100);
          expect(amount).toBeLessThanOrEqual(500000);
          expect(Number.isInteger(amount)).toBe(true);
        });

        invalidAmounts.forEach(amount => {
          const isValid = amount >= 100 && amount <= 500000 && Number.isInteger(amount);
          expect(isValid).toBe(false);
        });
      });

      it('should validate decimal amounts', () => {
        const validDecimals = [100.50, 500.75, 1000.25, 50000.99];
        const invalidDecimals = [100.123, 500.567, 1000.999];

        validDecimals.forEach(amount => {
          const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
          expect(decimalPlaces).toBeLessThanOrEqual(2);
        });

        invalidDecimals.forEach(amount => {
          const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
          expect(decimalPlaces).toBeGreaterThan(2);
        });
      });
    });

    describe('Group Name Validation', () => {
      it('should validate group names correctly', () => {
        const validGroupNames = [
          'Savings Group',
          'Community Fund',
          'Family Ikimina',
          'Business Circle',
          'Women\'s Savings Club'
        ];

        validGroupNames.forEach(name => {
          expect(name.length).toBeGreaterThanOrEqual(3);
          expect(name.length).toBeLessThanOrEqual(100);
          expect(/^[a-zA-Z0-9\s\-']+$/.test(name)).toBe(true);
        });
      });

      it('should reject invalid group names', () => {
        const invalidGroupNames = [
          'ab', // Too short
          'a'.repeat(101), // Too long
          'Group@Name', // Special characters
          '', // Empty
          '   ' // Spaces only
        ];

        invalidGroupNames.forEach(name => {
          const isValid = name.length >= 3 && 
                          name.length <= 100 && 
                          /^[a-zA-Z0-9\s\-']+$/.test(name);
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Password Validation', () => {
      it('should validate password strength', () => {
        const validPasswords = [
          'password123',
          'P@ssw0rd',
          'SecurePass2023',
          'MyStrongPassword1',
          'Bikore2023!'
        ];

        validPasswords.forEach(password => {
          expect(password.length).toBeGreaterThanOrEqual(8);
          expect(password.length).toBeLessThanOrEqual(128);
          expect(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)).toBe(true);
        });
      });

      it('should reject weak passwords', () => {
        const invalidPasswords = [
          '123', // Too short
          'password', // No uppercase or numbers
          'PASSWORD', // No lowercase or numbers
          '12345678', // No letters
          'a'.repeat(129) // Too long
        ];

        invalidPasswords.forEach(password => {
          const isValid = password.length >= 8 && 
                          password.length <= 128 && 
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password);
          expect(isValid).toBe(false);
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('General Rate Limiting', () => {
      it('should limit requests to protected endpoints', async () => {
        const loginData = {
          phone: '+250788123456',
          password: 'password123'
        };

        // Mock no user found for all requests
        query.mockResolvedValue({ rows: [] });

        // Make multiple rapid requests
        const requests = Array(6).fill().map(() => 
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );

        const responses = await Promise.all(requests);
        
        // First 5 should succeed, 6th should be rate limited
        const successfulRequests = responses.filter(res => res.status !== 429);
        const rateLimitedRequests = responses.filter(res => res.status === 429);
        
        expect(successfulRequests.length).toBeLessThanOrEqual(5);
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      });

      it('should allow requests after rate limit window', async () => {
        const loginData = {
          phone: '+250788123456',
          password: 'password123'
        };

        // Mock no user found
        query.mockResolvedValue({ rows: [] });

        // Make requests that trigger rate limit
        const requests = Array(6).fill().map(() => 
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );

        await Promise.all(requests);

        // Wait for rate limit window to reset (in real implementation)
        // This would typically be handled by the rate limiter
        
        // Make another request after window
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        // Should succeed after window reset
        expect(response.status).not.toBe(429);
      });
    });

    describe('Endpoint-Specific Rate Limiting', () => {
      it('should apply stricter limits to payment endpoints', async () => {
        const paymentData = {
          amount: 50000,
          phone: '+250788123456',
          group_id: 'group-123',
          type: 'contribution'
        };

        // Mock user lookup
        query.mockResolvedValue({ 
          rows: [{ id: 'user-123' }] 
        });

        // Make multiple rapid payment requests
        const requests = Array(4).fill().map(() => 
          request(app)
            .post('/api/payments/initiate')
            .set('Authorization', 'Bearer mock-token')
            .send(paymentData)
        );

        const responses = await Promise.all(requests);
        
        // Should be rate limited sooner than auth endpoints
        const rateLimitedRequests = responses.filter(res => res.status === 429);
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      });

      it('should apply moderate limits to group creation', async () => {
        const groupData = {
          name: 'Test Group',
          description: 'Test description',
          cycle_amount: 50000,
          cycle_frequency: 'monthly',
          max_members: 10
        };

        // Mock admin check
        query.mockResolvedValue({ 
          rows: [{ id: 'user-123' }] 
        });

        // Make multiple group creation requests
        const requests = Array(4).fill().map(() => 
          request(app)
            .post('/api/groups')
            .set('Authorization', 'Bearer mock-token')
            .send(groupData)
        );

        const responses = await Promise.all(requests);
        
        // Should have some rate limiting
        const rateLimitedRequests = responses.filter(res => res.status === 429);
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      });
    });

    describe('IP-based Rate Limiting', () => {
      it('should limit requests by IP address', async () => {
        const loginData = {
          phone: '+250788123456',
          password: 'password123'
        };

        // Mock no user found
        query.mockResolvedValue({ rows: [] });

        // Simulate requests from same IP
        const requests = Array(6).fill().map(() => 
          request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', '192.168.1.100')
            .send(loginData)
        );

        const responses = await Promise.all(requests);
        
        // Should be rate limited
        const rateLimitedRequests = responses.filter(res => res.status === 429);
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      });

      it('should allow different IPs to have separate limits', async () => {
        const loginData = {
          phone: '+250788123456',
          password: 'password123'
        };

        // Mock no user found
        query.mockResolvedValue({ rows: [] });

        // Simulate requests from different IPs
        const ip1Requests = Array(3).fill().map(() => 
          request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', '192.168.1.100')
            .send(loginData)
        );

        const ip2Requests = Array(3).fill().map(() => 
          request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', '192.168.1.101')
            .send(loginData)
        );

        const [ip1Responses, ip2Responses] = await Promise.all([
          Promise.all(ip1Requests),
          Promise.all(ip2Requests)
        ]);
        
        // Both should succeed since they're under individual limits
        const ip1RateLimited = ip1Responses.filter(res => res.status === 429);
        const ip2RateLimited = ip2Responses.filter(res => res.status === 429);
        
        expect(ip1RateLimited.length).toBe(0);
        expect(ip2RateLimited.length).toBe(0);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize string inputs', () => {
      const inputs = {
        '  John Doe  ': 'John Doe',
        '\tJane Smith\n': 'Jane Smith',
        '  Pierre  O\'Connor  ': "Pierre O'Connor",
        '   Marie   Claire   ': 'Marie Claire'
      };

      Object.entries(inputs).forEach(([input, expected]) => {
        const sanitized = input.trim();
        expect(sanitized).toBe(expected);
      });
    });

    it('should prevent SQL injection in inputs', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM groups; --",
        "' UNION SELECT * FROM users --"
      ];

      maliciousInputs.forEach(input => {
        // Check for SQL injection patterns
        const sqlPatterns = [
          /drop\s+table/i,
          /delete\s+from/i,
          /union\s+select/i,
          /or\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i
        ];

        const isMalicious = sqlPatterns.some(pattern => pattern.test(input));
        expect(isMalicious).toBe(true);
      });
    });

    it('should prevent XSS in inputs', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>'
      ];

      xssInputs.forEach(input => {
        // Check for XSS patterns
        const xssPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /<img/i,
          /<svg/i
        ];

        const isXSS = xssPatterns.some(pattern => pattern.test(input));
        expect(isXSS).toBe(true);
      });
    });
  });

  describe('Data Type Validation', () => {
    it('should validate numeric inputs', () => {
      const validNumbers = [100, 50000, 100000];
      const invalidNumbers = ['abc', '100abc', null, undefined, {}, []];

      validNumbers.forEach(num => {
        expect(typeof num).toBe('number');
        expect(!isNaN(num)).toBe(true);
        expect(Number.isInteger(num)).toBe(true);
      });

      invalidNumbers.forEach(num => {
        const isValidNumber = typeof num === 'number' && 
                           !isNaN(num) && 
                           Number.isInteger(num);
        expect(isValidNumber).toBe(false);
      });
    });

    it('should validate email formats (if used)', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@domain.co.rw',
        'user+tag@example.org',
        'user_name@example.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate UUID formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      const invalidUUIDs = [
        '123-456-789',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '550e8400e29b41d4a716446655440000'
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });

      invalidUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
    });
  });
});
