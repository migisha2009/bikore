const router = require('express').Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// PUT /api/users/profile — update profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, avatar_color } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE users SET name=$1, email=$2, avatar_color=$3 WHERE id=$4 RETURNING id, name, phone, email, avatar_color, created_at',
      [name || null, email || null, avatar_color || null, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/trust-score/:userId — get user's trust score
router.get('/trust-score/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow users to get their own score or admins
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { rows } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      trustScore: rows[0].trust_score || 100
    });
  } catch (error) {
    console.error('Error getting trust score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

module.exports = router;
