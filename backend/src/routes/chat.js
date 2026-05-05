const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/groups/:id/messages
// Get last 50 messages for a group
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;
    
    // Verify user is member of the group
    const memberCheck = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND group_id = $2 AND status = $3',
      [userId, groupId, 'active']
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = `
      SELECT 
        m.id,
        m.user_id,
        m.message,
        m.type,
        m.created_at,
        u.name,
        u.avatar_color,
        u.phone
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = $1
    `;
    
    let queryParams = [groupId];
    
    if (before) {
      query += ' AND m.created_at < $2';
      queryParams.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT $' + (queryParams.length + 1);
    queryParams.push(parseInt(limit));
    
    const result = await db.query(query, queryParams);
    
    const messages = result.rows.reverse().map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      message: msg.message,
      type: msg.type,
      createdAt: msg.created_at,
      user: {
        id: msg.user_id,
        name: msg.name,
        avatarColor: msg.avatar_color,
        phone: msg.phone
      }
    }));
    
    res.json(messages);
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/messages
// Send a message to a group
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { message, type = 'user' } = req.body;
    const userId = req.user.id;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Verify user is member of the group
    const memberCheck = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND group_id = $2 AND status = $3',
      [userId, groupId, 'active']
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Insert message
    const insertQuery = `
      INSERT INTO messages (group_id, user_id, message, type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, created_at
    `;
    
    const result = await db.query(insertQuery, [groupId, userId, message.trim(), type]);
    
    // Get user details for response
    const userQuery = await db.query(
      'SELECT name, avatar_color, phone FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userQuery.rows[0];
    
    const newMessage = {
      id: result.rows[0].id,
      userId,
      message: message.trim(),
      type,
      createdAt: result.rows[0].created_at,
      user: {
        id: userId,
        name: user.name,
        avatarColor: user.avatar_color,
        phone: user.phone
      }
    };
    
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/system-message
// Send system messages (for internal use)
router.post('/:id/system-message', authenticateToken, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { message, type = 'system' } = req.body;
    const userId = req.user.id;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Verify user is admin of the group
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1 AND admin_id = $2',
      [groupId, userId]
    );
    
    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Insert system message
    const insertQuery = `
      INSERT INTO messages (group_id, user_id, message, type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, created_at
    `;
    
    const result = await db.query(insertQuery, [groupId, userId, message.trim(), type]);
    
    const newMessage = {
      id: result.rows[0].id,
      userId,
      message: message.trim(),
      type,
      createdAt: result.rows[0].created_at,
      user: {
        id: userId,
        name: 'System',
        avatarColor: colors.forestGreen,
        phone: null
      }
    };
    
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.error('Error sending system message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to create system messages
async function createSystemMessage(groupId, message, type = 'system') {
  try {
    const insertQuery = `
      INSERT INTO messages (group_id, user_id, message, type, created_at)
      VALUES ($1, NULL, $2, $3, NOW())
      RETURNING id, created_at
    `;
    
    const result = await db.query(insertQuery, [groupId, message, type]);
    
    return {
      id: result.rows[0].id,
      userId: null,
      message,
      type,
      createdAt: result.rows[0].created_at,
      user: {
        id: null,
        name: 'System',
        avatarColor: colors.forestGreen,
        phone: null
      }
    };
  } catch (error) {
    console.error('Error creating system message:', error);
    return null;
  }
}

// Export helper for use in other routes
module.exports = {
  router,
  createSystemMessage
};
