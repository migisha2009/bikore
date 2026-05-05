const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });
  try {
    const { userId } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: userId };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to require admin role
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { authenticateToken, requireAdmin };
