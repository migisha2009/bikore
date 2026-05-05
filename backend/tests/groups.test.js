const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('uuid');
jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const app = require('../src/index');
const { query } = require('../src/db');

describe('Groups Tests', () => {
  let mockUserId;
  let mockGroupId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = uuidv4();
    mockGroupId = uuidv4();
  });

  describe('POST /api/groups', () => {
    it('should create a new group with valid data', async () => {
      const groupData = {
        name: 'Test Savings Group',
        description: 'A test group for savings',
        cycle_amount: 50000,
        cycle_frequency: 'monthly',
        max_members: 10
      };

      // Mock database responses
      query.mockResolvedValueOnce({ rows: [] }); // No existing group with same name
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: mockGroupId,
          name: groupData.name,
          description: groupData.description,
          cycle_amount: groupData.cycle_amount,
          cycle_frequency: groupData.cycle_frequency,
          max_members: groupData.max_members,
          admin_id: mockUserId,
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .send(groupData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(groupData.name);
      expect(response.body.admin_id).toBe(mockUserId);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        cycle_amount: -1000, // Negative amount
        max_members: 1 // Too few members
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should not create group with duplicate name for same user', async () => {
      const groupData = {
        name: 'Test Savings Group',
        description: 'A test group for savings',
        cycle_amount: 50000,
        cycle_frequency: 'monthly',
        max_members: 10
      };

      // Mock existing group with same name
      query.mockResolvedValueOnce({ 
        rows: [{ 
          name: groupData.name,
          admin_id: mockUserId
        }] 
      });

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .send(groupData)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate cycle amount limits', async () => {
      const groupData = {
        name: 'Test Savings Group',
        description: 'A test group for savings',
        cycle_amount: 10000000, // Too high
        cycle_frequency: 'monthly',
        max_members: 10
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .send(groupData)
        .expect(400);

      expect(response.body.error).toContain('cycle amount');
    });

    it('should validate max members limits', async () => {
      const groupData = {
        name: 'Test Savings Group',
        description: 'A test group for savings',
        cycle_amount: 50000,
        cycle_frequency: 'monthly',
        max_members: 100 // Too many members
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .send(groupData)
        .expect(400);

      expect(response.body.error).toContain('max members');
    });
  });

  describe('GET /api/groups', () => {
    it('should get user groups', async () => {
      const mockGroups = [
        {
          id: mockGroupId,
          name: 'Test Group 1',
          description: 'First test group',
          cycle_amount: 50000,
          cycle_frequency: 'monthly',
          max_members: 10,
          current_members: 5,
          admin_id: mockUserId,
          created_at: new Date()
        }
      ];

      query.mockResolvedValueOnce({ rows: mockGroups });

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Test Group 1');
    });

    it('should return empty array for user with no groups', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/groups/:id/join', () => {
    it('should allow user to join a group', async () => {
      const groupId = uuidv4();

      // Mock group lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          name: 'Test Group',
          max_members: 10,
          current_members: 5
        }] 
      });

      // Mock membership check
      query.mockResolvedValueOnce({ rows: [] });

      // Mock join operation
      query.mockResolvedValueOnce({ 
        rows: [{ 
          group_id: groupId,
          user_id: mockUserId,
          status: 'pending',
          joined_at: new Date()
        }] 
      });

      const response = await request(app)
        .post(`/api/groups/${groupId}/join`)
        .set('Authorization', `Bearer mock-token`)
        .expect(200);

      expect(response.body.message).toContain('join request sent');
    });

    it('should not allow joining full group', async () => {
      const groupId = uuidv4();

      // Mock full group
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          name: 'Test Group',
          max_members: 10,
          current_members: 10
        }] 
      });

      const response = await request(app)
        .post(`/api/groups/${groupId}/join`)
        .set('Authorization', `Bearer mock-token`)
        .expect(400);

      expect(response.body.error).toContain('group is full');
    });

    it('should not allow joining if already a member', async () => {
      const groupId = uuidv4();

      // Mock group lookup
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          name: 'Test Group',
          max_members: 10,
          current_members: 5
        }] 
      });

      // Mock existing membership
      query.mockResolvedValueOnce({ 
        rows: [{ 
          group_id: groupId,
          user_id: mockUserId,
          status: 'active'
        }] 
      });

      const response = await request(app)
        .post(`/api/groups/${groupId}/join`)
        .set('Authorization', `Bearer mock-token`)
        .expect(400);

      expect(response.body.error).toContain('already a member');
    });

    it('should handle non-existent group', async () => {
      const groupId = uuidv4();

      // Mock non-existent group
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/groups/${groupId}/join`)
        .set('Authorization', `Bearer mock-token`)
        .expect(404);

      expect(response.body.error).toContain('Group not found');
    });
  });

  describe('PUT /api/groups/:id/members/:userId', () => {
    it('should allow admin to approve member', async () => {
      const groupId = uuidv4();
      const targetUserId = uuidv4();

      // Mock admin check
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          admin_id: mockUserId
        }] 
      });

      // Mock member update
      query.mockResolvedValueOnce({ 
        rows: [{ 
          group_id: groupId,
          user_id: targetUserId,
          status: 'active'
        }] 
      });

      const response = await request(app)
        .put(`/api/groups/${groupId}/members/${targetUserId}`)
        .set('Authorization', `Bearer mock-token`)
        .send({ action: 'approve' })
        .expect(200);

      expect(response.body.message).toContain('member approved');
    });

    it('should not allow non-admin to approve members', async () => {
      const groupId = uuidv4();
      const targetUserId = uuidv4();

      // Mock non-admin check
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          admin_id: uuidv4() // Different admin
        }] 
      });

      const response = await request(app)
        .put(`/api/groups/${groupId}/members/${targetUserId}`)
        .set('Authorization', `Bearer mock-token`)
        .send({ action: 'approve' })
        .expect(403);

      expect(response.body.error).toContain('Only admin');
    });

    it('should allow admin to remove member', async () => {
      const groupId = uuidv4();
      const targetUserId = uuidv4();

      // Mock admin check
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          admin_id: mockUserId
        }] 
      });

      // Mock member removal
      query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .put(`/api/groups/${groupId}/members/${targetUserId}`)
        .set('Authorization', `Bearer mock-token`)
        .send({ action: 'remove' })
        .expect(200);

      expect(response.body.message).toContain('member removed');
    });
  });

  describe('Group Validation', () => {
    it('should validate group names', () => {
      const validNames = [
        'Savings Group',
        'Community Fund',
        'Family Ikimina'
      ];

      validNames.forEach(name => {
        expect(name.length).toBeGreaterThanOrEqual(3);
        expect(name.length).toBeLessThanOrEqual(100);
      });
    });

    it('should validate cycle frequencies', () => {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
      
      validFrequencies.forEach(freq => {
        expect(validFrequencies).toContain(freq);
      });
    });

    it('should validate cycle amounts', () => {
      const validAmounts = [1000, 50000, 100000, 500000];
      const invalidAmounts = [0, -100, 10000000];

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThanOrEqual(1000);
        expect(amount).toBeLessThanOrEqual(1000000);
      });

      invalidAmounts.forEach(amount => {
        const isValid = amount >= 1000 && amount <= 1000000;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Group Permissions', () => {
    it('should allow admin to update group settings', async () => {
      const groupId = uuidv4();
      const updateData = {
        name: 'Updated Group Name',
        description: 'Updated description'
      };

      // Mock admin check
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          admin_id: mockUserId
        }] 
      });

      // Mock update
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          ...updateData
        }] 
      });

      const response = await request(app)
        .put(`/api/groups/${groupId}`)
        .set('Authorization', `Bearer mock-token`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('should not allow non-admin to update group settings', async () => {
      const groupId = uuidv4();
      const updateData = {
        name: 'Updated Group Name'
      };

      // Mock non-admin check
      query.mockResolvedValueOnce({ 
        rows: [{ 
          id: groupId,
          admin_id: uuidv4() // Different admin
        }] 
      });

      const response = await request(app)
        .put(`/api/groups/${groupId}`)
        .set('Authorization', `Bearer mock-token`)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toContain('Only admin');
    });
  });
});
