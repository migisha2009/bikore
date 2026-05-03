const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const COLORS = ['#2C4A2E','#C9922A','#3D6B40','#1A3320','#8A9B8C'];
const safe = ({ password_hash, ...u }) => u;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Name, phone and password are required' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (exists.rows.length) return res.status(409).json({ error: 'Phone already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const avatar_color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const { rows } = await pool.query(
      'INSERT INTO users (name, phone, email, password_hash, avatar_color) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, phone, email || null, password_hash, avatar_color]
    );
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: safe(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safe(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.userId]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(safe(rows[0]));
});

module.exports = router;
