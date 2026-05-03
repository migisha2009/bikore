const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/groups — my groups with full details
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.*, m.position, m.joined_at,
        (SELECT COUNT(*) FROM members WHERE group_id=g.id AND status='active') AS member_count,
        (SELECT SUM(amount) FROM contributions WHERE group_id=g.id AND status='paid') AS total_saved,
        (SELECT id FROM cycles WHERE group_id=g.id AND status='active' LIMIT 1) AS active_cycle_id
      FROM groups g
      JOIN members m ON m.group_id=g.id
      WHERE m.user_id=$1 AND m.status='active'
      ORDER BY g.created_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id — full group detail
router.get('/:id', auth, async (req, res) => {
  try {
    const member = await pool.query('SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3', [req.params.id, req.userId, 'active']);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    const group = await pool.query('SELECT * FROM groups WHERE id=$1', [req.params.id]);
    if (!group.rows.length) return res.status(404).json({ error: 'Group not found' });

    const members = await pool.query(`
      SELECT m.*, u.name, u.phone, u.avatar_color
      FROM members m JOIN users u ON u.id=m.user_id
      WHERE m.group_id=$1 AND m.status='active' ORDER BY m.position
    `, [req.params.id]);

    const cycles = await pool.query('SELECT * FROM cycles WHERE group_id=$1 ORDER BY cycle_number', [req.params.id]);
    const activeCycle = cycles.rows.find(c => c.status === 'active');

    let myContribution = null;
    if (activeCycle) {
      const contrib = await pool.query('SELECT * FROM contributions WHERE cycle_id=$1 AND user_id=$2', [activeCycle.id, req.userId]);
      myContribution = contrib.rows[0] || null;
    }

    res.json({ ...group.rows[0], members: members.rows, cycles: cycles.rows, activeCycle, myContribution, isAdmin: group.rows[0].admin_id === req.userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups — create group
router.post('/', auth, async (req, res) => {
  const { name, description, emoji, contribution_amount, cycle_duration, total_cycles } = req.body;
  if (!name || !contribution_amount || !total_cycles)
    return res.status(400).json({ error: 'Name, amount and total_cycles required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const code = name.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4) + Math.floor(1000+Math.random()*9000);
    const g = await client.query(
      'INSERT INTO groups (name,description,emoji,contribution_amount,cycle_duration,total_cycles,admin_id,invite_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, description||'', emoji||'🌱', contribution_amount, cycle_duration||'monthly', total_cycles, req.userId, code]
    );
    const group = g.rows[0];
    await client.query('INSERT INTO members (group_id,user_id,position) VALUES ($1,$2,$3)', [group.id, req.userId, 1]);
    await client.query('INSERT INTO cycles (group_id,cycle_number,payout_user_id,start_date,status) VALUES ($1,1,$2,NOW(),$3)', [group.id, req.userId, 'active']);
    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// POST /api/groups/join — join by invite code
router.post('/join', auth, async (req, res) => {
  const { inviteCode } = req.body;
  try {
    const g = await pool.query('SELECT * FROM groups WHERE invite_code=$1', [inviteCode]);
    if (!g.rows.length) return res.status(404).json({ error: 'Invalid invite code' });
    const group = g.rows[0];
    const existing = await pool.query('SELECT id FROM members WHERE group_id=$1 AND user_id=$2', [group.id, req.userId]);
    if (existing.rows.length) return res.status(409).json({ error: 'Already a member' });
    const count = await pool.query('SELECT COUNT(*) FROM members WHERE group_id=$1', [group.id]);
    const position = parseInt(count.rows[0].count) + 1;
    await pool.query('INSERT INTO members (group_id,user_id,position) VALUES ($1,$2,$3)', [group.id, req.userId, position]);
    res.json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
