const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendSMS } = require('../services/sms');

// GET /api/admin/dashboard/:groupId
// Get admin dashboard overview data
router.get('/dashboard/:groupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get overview stats
    const overviewQuery = `
      SELECT 
        COUNT(m.id) as total_members,
        COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN co.status = 'paid' THEN 1 END) as paid_members,
        COUNT(CASE WHEN co.status = 'pending' THEN 1 END) as pending_payments,
        COALESCE(SUM(CASE WHEN co.status = 'paid' THEN co.amount END), 0) as total_collected,
        c.contribution_amount,
        c.cycle_number,
        c.end_date,
        c.payout_user_id,
        u.name as payout_user_name,
        u.phone as payout_user_phone
      FROM groups g
      JOIN cycles c ON g.id = c.group_id
      JOIN members m ON g.id = m.group_id
      LEFT JOIN contributions co ON c.id = co.cycle_id
      LEFT JOIN users u ON c.payout_user_id = u.id
      WHERE g.id = $1 AND c.status = 'active'
      GROUP BY g.id, c.id, c.contribution_amount, c.cycle_number, c.end_date, c.payout_user_id, u.name, u.phone
    `;
    
    const overviewResult = await db.query(overviewQuery, [groupId]);
    const overview = overviewResult.rows[0];
    
    // Get member details with payment status
    const membersQuery = `
      SELECT 
        m.id,
        m.user_id,
        m.position,
        m.status as member_status,
        u.name,
        u.phone,
        u.avatar_color,
        co.status as payment_status,
        co.amount,
        co.paid_at
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN contributions co ON m.user_id = co.user_id AND co.cycle_id = (
        SELECT id FROM cycles WHERE group_id = $1 AND status = 'active'
      )
      WHERE m.group_id = $1
      ORDER BY m.position ASC
    `;
    
    const membersResult = await db.query(membersQuery, [groupId]);
    const members = membersResult.rows.map(member => ({
      id: member.id,
      userId: member.user_id,
      position: member.position,
      status: member.member_status,
      name: member.name,
      phone: member.phone,
      avatarColor: member.avatar_color,
      paymentStatus: member.payment_status || 'pending',
      amount: member.amount,
      paidAt: member.paid_at
    }));
    
    // Get transaction history
    const historyQuery = `
      SELECT 
        p.id,
        p.amount,
        p.method,
        p.status,
        p.created_at,
        c.cycle_number,
        u.name as recipient_name
      FROM payouts p
      JOIN cycles c ON p.cycle_id = c.id
      JOIN users u ON p.recipient_phone = u.phone
      WHERE p.group_id = $1
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    
    const historyResult = await db.query(historyQuery, [groupId]);
    const history = historyResult.rows.map(payout => ({
      id: payout.id,
      amount: parseFloat(payout.amount),
      method: payout.method,
      status: payout.status,
      createdAt: payout.created_at,
      cycleNumber: payout.cycle_number,
      recipientName: payout.recipient_name
    }));
    
    res.json({
      overview: {
        totalMembers: parseInt(overview.total_members),
        activeMembers: parseInt(overview.active_members),
        paidMembers: parseInt(overview.paid_members),
        pendingPayments: parseInt(overview.pending_payments),
        totalCollected: parseFloat(overview.total_collected),
        contributionAmount: parseFloat(overview.contribution_amount),
        cycleNumber: parseInt(overview.cycle_number),
        nextPayoutDate: overview.end_date,
        payoutUser: overview.payout_user_id ? {
          id: overview.payout_user_id,
          name: overview.payout_user_name,
          phone: overview.payout_user_phone
        } : null
      },
      members,
      history
    });
    
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/send-reminder
// Send SMS reminder to pending members
router.post('/send-reminder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { groupId, memberIds } = req.body;
    const adminId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id, name FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const groupName = adminCheck.rows[0].name;
    
    // Get member details
    const membersQuery = `
      SELECT u.name, u.phone, c.contribution_amount
      FROM members m
      JOIN users u ON m.user_id = u.id
      JOIN cycles c ON m.group_id = c.group_id
      WHERE m.id = ANY($1) AND c.status = 'active'
    `;
    
    const membersResult = await db.query(membersQuery, [memberIds]);
    
    // Send SMS to each member
    const reminders = [];
    for (const member of membersResult.rows) {
      try {
        await sendSMS(
          member.phone,
          `Reminder: Your Rwf ${member.contribution_amount} contribution for ${groupName} is due. Please pay via MTN MoMo or Airtel Money.`
        );
        reminders.push({ name: member.name, phone: member.phone, sent: true });
      } catch (error) {
        console.error(`Failed to send SMS to ${member.name}:`, error);
        reminders.push({ name: member.name, phone: member.phone, sent: false });
      }
    }
    
    res.json({
      message: 'Reminders sent',
      reminders,
      groupName
    });
    
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/group-settings/:groupId
// Update group settings
router.put('/group-settings/:groupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, rules } = req.body;
    const adminId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update group settings
    const updateQuery = `
      UPDATE groups 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          rules = COALESCE($3, rules),
          updated_at = NOW()
      WHERE id = $4
    `;
    
    await db.query(updateQuery, [name, description, rules, groupId]);
    
    res.json({ message: 'Group settings updated successfully' });
    
  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/remove-member/:groupId/:memberId
// Remove member from group
router.delete('/remove-member/:groupId/:memberId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const adminId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if member has paid in current cycle
    const paymentCheck = await db.query(`
      SELECT co.status
      FROM contributions co
      JOIN cycles c ON co.cycle_id = c.id
      WHERE co.user_id = (SELECT user_id FROM members WHERE id = $1)
        AND c.group_id = $2 AND c.status = 'active'
    `, [memberId, groupId]);
    
    if (paymentCheck.rows[0]?.status === 'paid') {
      return res.status(400).json({ 
        error: 'Cannot remove member who has paid in current cycle' 
      });
    }
    
    // Remove member
    await db.query('DELETE FROM members WHERE id = $1', [memberId]);
    
    // Remove pending contributions
    await db.query(`
      DELETE FROM contributions 
      WHERE user_id = (SELECT user_id FROM members WHERE id = $1)
        AND cycle_id = (SELECT id FROM cycles WHERE group_id = $2 AND status = 'active')
    `, [memberId, groupId]);
    
    res.json({ message: 'Member removed successfully' });
    
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/transactions/:groupId
// Get transaction history for admin
router.get('/transactions/:groupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50, cycle = null } = req.query;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const offset = (page - 1) * limit;
    
    let whereClause = `WHERE p.group_id = $1`;
    let queryParams = [groupId];
    
    if (cycle) {
      whereClause += ` AND c.cycle_number = $2`;
      queryParams.push(cycle);
    }
    
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.method,
        p.status,
        p.created_at,
        c.cycle_number,
        u.name as recipient_name,
        u.phone as recipient_phone
      FROM payouts p
      JOIN cycles c ON p.cycle_id = c.id
      JOIN users u ON p.recipient_phone = u.phone
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const result = await db.query(query, queryParams);
    
    const transactions = result.rows.map(transaction => ({
      id: transaction.id,
      amount: parseFloat(transaction.amount),
      method: transaction.method,
      status: transaction.status,
      createdAt: transaction.created_at,
      cycleNumber: transaction.cycle_number,
      recipientName: transaction.recipient_name,
      recipientPhone: transaction.recipient_phone
    }));
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit,
        hasMore: transactions.length === limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
