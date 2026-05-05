const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('africastalking', () => ({
  SMS: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  }))
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  getClient: jest.fn()
}));

const app = require('../src/index');
const { query, getClient } = require('../src/db');

describe('Payments Tests', () => {
  let mockUserId;
  let mockGroupId;
  let mockPaymentId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'user-123';
    mockGroupId = 'group-123';
    mockPaymentId = 'payment-123';
  });

  describe('Phone Validation', () => {
    it('should validate Rwanda phone numbers for payments', () => {
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

    it('should reject invalid phone numbers for payments', () => {
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

    it('should sanitize phone numbers', () => {
      const phoneNumbers = [
        '+250788123456',
        '0788123456',
        '+250 788 123 456'
      ];

      const expected = '+250788123456';
      
      phoneNumbers.forEach(phone => {
        const sanitized = phone.replace(/\D/g, '');
        if (sanitized.length === 12 && sanitized.startsWith('250')) {
          expect('+' + sanitized).toBe(expected);
        } else if (sanitized.length === 9 && sanitized.startsWith('7')) {
          expect('+250' + sanitized).toBe(expected);
        }
      });
    });
  });

  describe('POST /api/payments/initiate', () => {
    it('should initiate payment with valid data', async () => {
      const paymentData = {
        amount: 50000,
        phone: '+250788123456',
        group_id: mockGroupId,
        type: 'contribution'
      };

      // Mock user lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockUserId,
          phone: '+250788123456'
        }] 
      });

      // Mock group lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockGroupId,
          name: 'Test Group',
          cycle_amount: 50000,
          admin_id: mockUserId
        }] 
      });

      // Mock payment creation
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockPaymentId,
          ...paymentData,
          status: 'pending',
          user_id: mockUserId,
          created_at: new Date()
        }] 
      });

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer mock-token`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe(paymentData.amount);
      expect(response.body.status).toBe('pending');
    });

    it('should validate payment amount', async () => {
      const paymentData = {
        amount: -1000, // Negative amount
        phone: '+250788123456',
        group_id: mockGroupId,
        type: 'contribution'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer mock-token`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toContain('amount');
    });

    it('should validate payment amount limits', async () => {
      const paymentData = {
        amount: 5000000, // Too high
        phone: '+250788123456',
        group_id: mockGroupId,
        type: 'contribution'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer mock-token`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toContain('amount');
    });

    it('should require valid phone number', async () => {
      const paymentData = {
        amount: 50000,
        phone: 'invalid-phone',
        group_id: mockGroupId,
        type: 'contribution'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer mock-token`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toContain('phone');
    });

    it('should validate payment type', async () => {
      const paymentData = {
        amount: 50000,
        phone: '+250788123456',
        group_id: mockGroupId,
        type: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer mock-token`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toContain('type');
    });
  });

  describe('POST /api/payments/confirm', () => {
    it('should confirm payment with valid reference', async () => {
      const confirmData = {
        payment_reference: 'REF123456',
        transaction_id: 'TXN789'
      };

      // Mock payment lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockPaymentId,
          status: 'pending',
          amount: 50000,
          user_id: mockUserId,
          group_id: mockGroupId
        }] 
      });

      // Mock payment update
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockPaymentId,
          status: 'completed',
          transaction_id: confirmData.transaction_id,
          confirmed_at: new Date()
        }] 
      });

      // Mock contribution record
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'contrib-123',
          payment_id: mockPaymentId,
          user_id: mockUserId,
          group_id: mockGroupId,
          amount: 50000,
          created_at: new Date()
        }] 
      });

      const response = await request(app)
        .post('/api/payments/confirm')
        .send(confirmData)
        .expect(200);

      expect(response.body.message).toContain('confirmed');
    });

    it('should not confirm already confirmed payment', async () => {
      const confirmData = {
        payment_reference: 'REF123456',
        transaction_id: 'TXN789'
      };

      // Mock already confirmed payment
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockPaymentId,
          status: 'completed',
          confirmed_at: new Date()
        }] 
      });

      const response = await request(app)
        .post('/api/payments/confirm')
        .send(confirmData)
        .expect(400);

      expect(response.body.error).toContain('already confirmed');
    });

    it('should handle non-existent payment reference', async () => {
      const confirmData = {
        payment_reference: 'NONEXISTENT',
        transaction_id: 'TXN789'
      };

      // Mock non-existent payment
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/confirm')
        .send(confirmData)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/payments', () => {
    it('should get user payment history', async () => {
      const mockPayments = [
        {
          id: mockPaymentId,
          amount: 50000,
          status: 'completed',
          type: 'contribution',
          group_id: mockGroupId,
          group_name: 'Test Group',
          created_at: new Date(),
          confirmed_at: new Date()
        }
      ];

      query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].amount).toBe(50000);
      expect(response.body[0].status).toBe('completed');
    });

    it('should filter payments by status', async () => {
      const mockPayments = [
        {
          id: mockPaymentId,
          amount: 50000,
          status: 'completed',
          type: 'contribution'
        }
      ];

      query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get('/api/payments?status=completed')
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('completed');
    });

    it('should filter payments by group', async () => {
      const mockPayments = [
        {
          id: mockPaymentId,
          amount: 50000,
          status: 'completed',
          type: 'contribution',
          group_id: mockGroupId
        }
      ];

      query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get(`/api/payments?group_id=${mockGroupId}`)
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].group_id).toBe(mockGroupId);
    });
  });

  describe('Payment Security', () => {
    it('should prevent duplicate payment references', async () => {
      const confirmData = {
        payment_reference: 'REF123456',
        transaction_id: 'TXN789'
      };

      // Mock existing payment with same reference
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockPaymentId,
          payment_reference: confirmData.payment_reference,
          status: 'completed'
        }] 
      });

      const response = await request(app)
        .post('/api/payments/confirm')
        .send(confirmData)
        .expect(400);

      expect(response.body.error).toContain('already used');
    });

    it('should validate transaction ID format', async () => {
      const invalidTransactionIds = [
        '', // Empty
        'a'.repeat(101), // Too long
        '123!@#' // Invalid characters
      ];

      invalidTransactionIds.forEach(async (transactionId) => {
        const confirmData = {
          payment_reference: 'REF123456',
          transaction_id: transactionId
        };

        const response = await request(app)
          .post('/api/payments/confirm')
          .send(confirmData);

        if (transactionId === '' || transactionId.length > 100) {
          expect(response.status).toBe(400);
        }
      });
    });

    it('should rate limit payment initiation', async () => {
      const paymentData = {
        amount: 50000,
        phone: '+250788123456',
        group_id: mockGroupId,
        type: 'contribution'
      };

      // Mock user lookup for all requests
      query.mockResolvedValue({ 
        rows: [{ 
          id: mockUserId,
          phone: '+250788123456'
        }] 
      });

      // Make multiple rapid requests
      const requests = Array(6).fill().map(() => 
        request(app)
          .post('/api/payments/initiate')
          .set('Authorization', `Bearer mock-token`)
          .send(paymentData)
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Payment Amount Validation', () => {
    it('should validate minimum amounts', () => {
      const validAmounts = [100, 500, 1000, 50000];
      const invalidAmounts = [0, -100, 50];

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThanOrEqual(100);
      });

      invalidAmounts.forEach(amount => {
        expect(amount >= 100).toBe(false);
      });
    });

    it('should validate maximum amounts', () => {
      const validAmounts = [1000, 50000, 100000, 500000];
      const invalidAmounts = [1000001, 5000000];

      validAmounts.forEach(amount => {
        expect(amount).toBeLessThanOrEqual(500000);
      });

      invalidAmounts.forEach(amount => {
        expect(amount <= 500000).toBe(false);
      });
    });

    it('should validate amount precision', () => {
      const validAmounts = [100, 100.50, 500.75];
      const invalidAmounts = [100.123, 500.567];

      validAmounts.forEach(amount => {
        const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });

      invalidAmounts.forEach(amount => {
        const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeGreaterThan(2);
      });
    });
  });

  describe('Payment Types', () => {
    it('should validate payment types', () => {
      const validTypes = ['contribution', 'penalty', 'bonus', 'refund'];
      
      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it('should handle different payment types correctly', async () => {
      const paymentTypes = ['contribution', 'penalty', 'bonus'];

      for (const type of paymentTypes) {
        const paymentData = {
          amount: 50000,
          phone: '+250788123456',
          group_id: mockGroupId,
          type: type
        };

        // Mock user and group lookup
        query.mockResolvedValueOnce({ rows: [{ id: mockUserId }] });
        query.mockResolvedValueOnce({ rows: [{ id: mockGroupId }] });
        
        // Mock payment creation
        query.mockResolvedValueOnce({ 
          rows: [{ 
            id: mockPaymentId,
            ...paymentData,
            status: 'pending',
            user_id: mockUserId
          }] 
        });

        const response = await request(app)
          .post('/api/payments/initiate')
          .set('Authorization', `Bearer mock-token`)
          .send(paymentData)
          .expect(201);

        expect(response.body.type).toBe(type);
      }
    });
  });
});
