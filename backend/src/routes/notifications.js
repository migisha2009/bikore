const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/notifications/register-token
// Save push token to users table
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    
    // Update user's push token
    const updateQuery = `
      UPDATE users 
      SET push_token = $1, push_token_updated_at = NOW()
      WHERE id = $2
      RETURNING id, push_token
    `;
    
    const result = await db.query(updateQuery, [token, userId]);
    
    res.json({
      message: 'Push token registered successfully',
      user: {
        id: userId,
        pushToken: result.rows[0].push_token
      }
    });
    
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications
// Return all notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.body,
        n.data,
        n.created_at,
        n.read_at,
        u.name as sender_name,
        u.avatar_color as sender_avatar_color
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [userId, limit, offset]);
    
    const notifications = result.rows.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data ? JSON.parse(notification.data) : null,
      createdAt: notification.created_at,
      readAt: notification.read_at,
      senderName: notification.sender_name,
      senderAvatarColor: notification.sender_avatar_color
    }));
    
    // Get total unread count
    const countQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL
    `;
    
    const countResult = await db.query(countQuery, [userId]);
    const unreadCount = parseInt(countResult.rows[0].unread_count);
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit,
        hasMore: notifications.length === limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/read-all
// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const updateQuery = `
      UPDATE notifications 
      SET read_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL
    `;
    
    await db.query(updateQuery, [userId]);
    
    res.json({ message: 'All notifications marked as read' });
    
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/:id/read
// Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const updateQuery = `
      UPDATE notifications 
      SET read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(updateQuery, [id, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
