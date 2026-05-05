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
        (SELECT json_build_object(
          'id', c.id,
          'cycle_number', c.cycle_number,
          'status', c.status,
          'start_date', c.start_date,
          'payout_user_id', c.payout_user_id
        ) FROM cycles c WHERE c.group_id=g.id AND c.status='active' LIMIT 1) AS "activeCycle"
      FROM groups g
      JOIN members m ON m.group_id=g.id
      WHERE m.user_id=$1 AND m.status='active'
      ORDER BY g.created_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/search — search group by invite code
router.get('/search', auth, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Invite code required' });
  
  try {
    const { rows } = await pool.query(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM members WHERE group_id=g.id AND status='active') AS member_count,
        (SELECT COUNT(*) FROM cycles WHERE group_id=g.id AND status='completed') AS current_cycle
      FROM groups g 
      WHERE g.invite_code=$1
    `, [code]);
    
    if (!rows.length) return res.status(404).json({ error: 'Group not found' });
    
    res.json(rows[0]);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
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

// POST /api/groups — create group (enhanced)
router.post('/', auth, async (req, res) => {
  const { 
    name, description, emoji, contribution_amount, cycle_duration, total_cycles, 
    max_members, is_private, requires_approval, rules, late_penalty, payout_method 
  } = req.body;
  
  // Validation
  if (!name || !contribution_amount || !total_cycles)
    return res.status(400).json({ error: 'Name, amount and total_cycles required' });
  
  if (contribution_amount < 1000)
    return res.status(400).json({ error: 'Contribution amount must be at least 1000 Rwf' });
  
  if (total_cycles < 2 || total_cycles > 50)
    return res.status(400).json({ error: 'Total cycles must be between 2 and 50' });
  
  if (max_members && (max_members < 2 || max_members > 50))
    return res.status(400).json({ error: 'Max members must be between 2 and 50' });
  
  if (payout_method && !['order', 'random', 'bidding'].includes(payout_method))
    return res.status(400).json({ error: 'Invalid payout method' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Generate 8-character invite code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let inviteCode = '';
    for (let i = 0; i < 8; i++) {
      inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const g = await client.query(
      `INSERT INTO groups (name,description,emoji,contribution_amount,cycle_duration,total_cycles,
        max_members,is_private,requires_approval,rules,late_penalty,payout_method,admin_id,invite_code,invite_expires_at) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW() + INTERVAL '48 hours') RETURNING *`,
      [
        name, description||'', emoji||'🌱', contribution_amount, cycle_duration||'monthly', total_cycles,
        max_members || total_cycles, is_private || false, requires_approval !== false, rules, 
        late_penalty || 0, payout_method || 'order', req.userId, inviteCode
      ]
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

// POST /api/groups/request-join — Request to join
router.post('/request-join', auth, async (req, res) => {
  const { inviteCode, message } = req.body;
  
  if (!inviteCode)
    return res.status(400).json({ error: 'Invite code required' });
  
  try {
    const g = await pool.query('SELECT * FROM groups WHERE invite_code=$1', [inviteCode]);
    if (!g.rows.length) return res.status(404).json({ error: 'Invalid invite code' });
    
    const group = g.rows[0];
    
    // Check if invite code is expired
    if (group.invite_expires_at && new Date() > new Date(group.invite_expires_at)) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }
    
    // Check if user is already a member or has a pending request
    const existing = await pool.query(
      'SELECT id FROM members WHERE group_id=$1 AND user_id=$2 UNION SELECT id FROM member_requests WHERE group_id=$1 AND user_id=$2 AND status=$3',
      [group.id, req.userId, 'pending']
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Already a member or request pending' });
    
    // Check if group is full
    const memberCount = await pool.query('SELECT COUNT(*) FROM members WHERE group_id=$1 AND status=$2', [group.id, 'active']);
    if (parseInt(memberCount.rows[0].count) >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }
    
    // Create member request
    await pool.query(
      'INSERT INTO member_requests (group_id, user_id, message) VALUES ($1, $2, $3)',
      [group.id, req.userId, message || '']
    );
    
    // TODO: Send notification to admin (implement notification system)
    
    res.json({ message: 'Join request sent, waiting for admin approval' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// GET /api/groups/:id/requests — Get pending requests (admin only)
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id=$1 AND admin_id=$2', [req.params.id, req.userId]);
    if (!group.rows.length) return res.status(403).json({ error: 'Only admin can view requests' });
    
    const requests = await pool.query(`
      SELECT mr.*, u.name, u.phone, u.avatar_color, u.created_at as user_created_at
      FROM member_requests mr
      JOIN users u ON u.id = mr.user_id
      WHERE mr.group_id = $1 AND mr.status = 'pending'
      ORDER BY mr.requested_at DESC
    `, [req.params.id]);
    
    res.json(requests.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/requests/:requestId/approve — Approve member
router.post('/:id/requests/:requestId/approve', auth, async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id=$1 AND admin_id=$2', [req.params.id, req.userId]);
    if (!group.rows.length) return res.status(403).json({ error: 'Only admin can approve requests' });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update request status
      const request = await client.query(
        'UPDATE member_requests SET status=$1, reviewed_at=$2, reviewed_by=$3 WHERE id=$4 AND group_id=$5 RETURNING *',
        ['approved', new Date(), req.userId, req.params.requestId, req.params.id]
      );
      
      if (!request.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Get next position
      const positionResult = await client.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM members WHERE group_id=$1',
        [req.params.id]
      );
      const nextPosition = positionResult.rows[0].next_position;
      
      // Add user to members
      await client.query(
        'INSERT INTO members (group_id, user_id, position) VALUES ($1, $2, $3)',
        [req.params.id, request.rows[0].user_id, nextPosition]
      );
      
      await client.query('COMMIT');
      
      // Return updated member list
      const members = await client.query(`
        SELECT m.*, u.name, u.phone, u.avatar_color
        FROM members m JOIN users u ON u.id=m.user_id
        WHERE m.group_id=$1 AND m.status='active' ORDER BY m.position
      `, [req.params.id]);
      
      res.json(members.rows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/requests/:requestId/reject — Reject member
router.post('/:id/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id=$1 AND admin_id=$2', [req.params.id, req.userId]);
    if (!group.rows.length) return res.status(403).json({ error: 'Only admin can reject requests' });
    
    const result = await pool.query(
      'UPDATE member_requests SET status=$1, reviewed_at=$2, reviewed_by=$3 WHERE id=$4 AND group_id=$5 RETURNING *',
      ['rejected', new Date(), req.userId, req.params.requestId, req.params.id]
    );
    
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found' });
    
    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id/members/:userId — Remove member (admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id=$1 AND admin_id=$2', [req.params.id, req.userId]);
    if (!group.rows.length) return res.status(403).json({ error: 'Only admin can remove members' });
    
    // Prevent removing admin
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Admin cannot be removed from group' });
    }
    
    // Check if user has pending contribution in current cycle
    const activeCycle = await pool.query('SELECT id FROM cycles WHERE group_id=$1 AND status=$2', [req.params.id, 'active']);
    if (activeCycle.rows.length > 0) {
      const pendingContribution = await pool.query(
        'SELECT id FROM contributions WHERE cycle_id=$1 AND user_id=$2 AND status=$3',
        [activeCycle.rows[0].id, req.params.userId, 'pending']
      );
      if (pendingContribution.rows.length > 0) {
        return res.status(400).json({ error: 'Cannot remove member with pending contribution' });
      }
    }
    
    const result = await pool.query(
      'UPDATE members SET status=$1 WHERE group_id=$2 AND user_id=$3 RETURNING *',
      ['removed', req.params.id, req.params.userId]
    );
    
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/regenerate-invite — Regenerate invite code
router.post('/:id/regenerate-invite', auth, async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id=$1 AND admin_id=$2', [req.params.id, req.userId]);
    if (!group.rows.length) return res.status(403).json({ error: 'Only admin can regenerate invite code' });
    
    // Generate new 8-character invite code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newInviteCode = '';
    for (let i = 0; i < 8; i++) {
      newInviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const result = await pool.query(
      'UPDATE groups SET invite_code=$1, invite_expires_at=NOW() + INTERVAL \'48 hours\' WHERE id=$2 RETURNING invite_code',
      [newInviteCode, req.params.id]
    );
    
    res.json({ inviteCode: result.rows[0].invite_code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id/chat — Get chat messages
router.get('/:id/chat', auth, async (req, res) => {
  try {
    const member = await pool.query('SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3', [req.params.id, req.userId, 'active']);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });
    
    const messages = await pool.query(`
      SELECT gm.*, u.name, u.avatar_color
      FROM group_messages gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY gm.created_at DESC
      LIMIT 50
    `, [req.params.id]);
    
    res.json(messages.rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/chat — Send message
router.post('/:id/chat', auth, async (req, res) => {
  const { message } = req.body;
  
  if (!message || message.trim().length === 0)
    return res.status(400).json({ error: 'Message cannot be empty' });
  
  if (message.length > 500)
    return res.status(400).json({ error: 'Message too long (max 500 characters)' });
  
  try {
    const member = await pool.query('SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3', [req.params.id, req.userId, 'active']);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });
    
    const result = await pool.query(
      'INSERT INTO group_messages (group_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.userId, message.trim()]
    );
    
    // Get user info for response
    const user = await pool.query('SELECT name, avatar_color FROM users WHERE id=$1', [req.userId]);
    
    res.json({
      ...result.rows[0],
      name: user.rows[0].name,
      avatar_color: user.rows[0].avatar_color
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
