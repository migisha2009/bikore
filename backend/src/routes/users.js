const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// PUT /api/users/profile — update profile
router.put('/profile', auth, async (req, res) => {
  const { name, email, avatar_color } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE users SET name=$1, email=$2, avatar_color=$3 WHERE id=$4 RETURNING id, name, phone, email, avatar_color, created_at',
      [name || null, email || null, avatar_color || null, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
