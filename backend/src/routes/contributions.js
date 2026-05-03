const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/contributions/my-summary
router.get('/my-summary', auth, async (req, res) => {
  try {
    const contributed = await pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM contributions WHERE user_id=$1 AND status=$2', [req.userId, 'paid']);
    const pending = await pool.query(`SELECT COUNT(*) FROM contributions c JOIN cycles cy ON cy.id=c.cycle_id WHERE c.user_id=$1 AND c.status='pending' AND cy.status='active'`, [req.userId]);
    const groups = await pool.query('SELECT COUNT(*) FROM members WHERE user_id=$1 AND status=$2', [req.userId, 'active']);
    res.json({
      totalContributed: parseInt(contributed.rows[0].total),
      pendingPayments: parseInt(pending.rows[0].count),
      activeGroups: parseInt(groups.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/contributions?cycleId=&groupId=
router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT c.*, u.name, u.avatar_color FROM contributions c JOIN users u ON u.id=c.user_id WHERE 1=1`;
    const params = [];
    if (req.query.cycleId)  { params.push(req.query.cycleId);  query += ` AND c.cycle_id=$${params.length}`; }
    if (req.query.groupId)  { params.push(req.query.groupId);  query += ` AND c.group_id=$${params.length}`; }
    if (req.query.userId)   { params.push(req.query.userId);   query += ` AND c.user_id=$${params.length}`; }
    query += ' ORDER BY c.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/contributions/pay
router.post('/pay', auth, async (req, res) => {
  const { groupId, cycleId, method } = req.body;
  if (!groupId || !cycleId || !method) return res.status(400).json({ error: 'groupId, cycleId, method required' });
  try {
    const member = await pool.query('SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3', [groupId, req.userId, 'active']);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    const existing = await pool.query('SELECT * FROM contributions WHERE cycle_id=$1 AND user_id=$2', [cycleId, req.userId]);
    if (existing.rows.length) {
      if (existing.rows[0].status === 'paid') return res.status(409).json({ error: 'Already paid' });
      const { rows } = await pool.query('UPDATE contributions SET status=$1, paid_at=NOW(), method=$2 WHERE id=$3 RETURNING *', ['paid', method, existing.rows[0].id]);
      return res.json(rows[0]);
    }

    const group = await pool.query('SELECT contribution_amount FROM groups WHERE id=$1', [groupId]);
    const { rows } = await pool.query(
      'INSERT INTO contributions (cycle_id,group_id,user_id,amount,method,status,paid_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [cycleId, groupId, req.userId, group.rows[0].contribution_amount, method, 'paid']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
