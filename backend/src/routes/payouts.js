const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendSMS } = require('../services/sms');

// GET /api/payouts/ready
// Find all active cycles where ALL members have paid (contributions all status='paid')
router.get('/ready', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id as cycle_id,
        c.group_id,
        g.name as group_name,
        g.emoji as group_emoji,
        c.cycle_number,
        c.contribution_amount,
        COUNT(m.id) as member_count,
        COUNT(CASE WHEN co.status = 'paid' THEN 1 END) as paid_count,
        c.start_date,
        c.end_date
      FROM cycles c
      JOIN groups g ON c.group_id = g.id
      JOIN members m ON c.group_id = m.group_id AND m.status = 'active'
      LEFT JOIN contributions co ON c.id = co.cycle_id AND m.user_id = co.user_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.group_id, g.name, g.emoji, c.cycle_number, c.contribution_amount, c.start_date, c.end_date
      HAVING COUNT(m.id) = COUNT(CASE WHEN co.status = 'paid' THEN 1 END)
      ORDER BY c.end_date ASC
    `;
    
    const result = await db.query(query);
    
    const readyCycles = result.rows.map(cycle => ({
      id: cycle.cycle_id,
      groupId: cycle.group_id,
      groupName: cycle.group_name,
      groupEmoji: cycle.group_emoji,
      cycleNumber: cycle.cycle_number,
      contributionAmount: parseFloat(cycle.contribution_amount),
      memberCount: parseInt(cycle.member_count),
      paidCount: parseInt(cycle.paid_count),
      totalAmount: parseFloat(cycle.contribution_amount) * parseInt(cycle.member_count),
      startDate: cycle.start_date,
      endDate: cycle.end_date
    }));
    
    res.json(readyCycles);
    
  } catch (error) {
    console.error('Error fetching ready payouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payouts/confirm
// Admin only - verify all contributions paid and create payout record
router.post('/confirm', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cycleId, groupId, method, phone } = req.body;
    const adminId = req.user.id;
    
    // Validate inputs
    if (!cycleId || !groupId || !method || !phone) {
      return res.status(400).json({ 
        error: 'Missing required fields: cycleId, groupId, method, phone' 
      });
    }
    
    if (!['momo', 'airtel'].includes(method.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid payment method. Must be momo or airtel' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      // Verify all members have paid
      const verifyQuery = `
        SELECT COUNT(m.id) as total_members, COUNT(co.id) as paid_members
        FROM cycles c
        JOIN members m ON c.group_id = m.group_id AND m.status = 'active'
        LEFT JOIN contributions co ON c.id = co.cycle_id AND m.user_id = co.user_id
        WHERE c.id = $1 AND c.status = 'active'
      `;
      
      const verifyResult = await db.query(verifyQuery, [cycleId]);
      const { total_members, paid_members } = verifyResult.rows[0];
      
      if (parseInt(total_members) !== parseInt(paid_members)) {
        await db.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Not all members have paid their contributions' 
        });
      }
      
      // Get cycle and group details
      const cycleQuery = `
        SELECT c.*, g.name as group_name, g.admin_id
        FROM cycles c
        JOIN groups g ON c.group_id = g.id
        WHERE c.id = $1
      `;
      
      const cycleResult = await db.query(cycleQuery, [cycleId]);
      const cycle = cycleResult.rows[0];
      
      if (!cycle) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Cycle not found' });
      }
      
      // Verify admin permissions
      if (cycle.admin_id !== adminId) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: 'Only admin can confirm payouts' });
      }
      
      // Create payout record
      const payoutQuery = `
        INSERT INTO payouts (cycle_id, group_id, recipient_phone, method, amount, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING id, recipient_phone, amount
      `;
      
      const payoutResult = await db.query(payoutQuery, [
        cycleId, 
        groupId, 
        phone, 
        method, 
        cycle.contribution_amount * parseInt(total_members),
        'completed',
        adminId
      ]);
      
      const payout = payoutResult.rows[0];
      
      // Update cycle status to 'completed'
      await db.query(
        'UPDATE cycles SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', cycleId]
      );
      
      // Get next payout user (next in rotation)
      const nextPayoutQuery = `
        SELECT m.user_id, m.position
        FROM members m
        JOIN cycles c ON m.group_id = c.group_id
        WHERE m.group_id = $1 AND m.status = 'active'
        ORDER BY m.position ASC
        LIMIT 1 OFFSET $2
      `;
      
      const nextPayoutResult = await db.query(nextPayoutQuery, [groupId, parseInt(cycle.cycle_number)]);
      const nextPayoutUser = nextPayoutResult.rows[0];
      
      // Create next cycle
      let nextCycle;
      if (nextPayoutUser) {
        const nextCycleQuery = `
          INSERT INTO cycles (group_id, cycle_number, contribution_amount, start_date, end_date, status, payout_user_id)
          VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${cycle.cycle_duration}', 'active', $4)
          RETURNING id, cycle_number
        `;
        
        const nextCycleResult = await db.query(nextCycleQuery, [
          groupId,
          parseInt(cycle.cycle_number) + 1,
          cycle.contribution_amount,
          nextPayoutUser.user_id
        ]);
        
        nextCycle = nextCycleResult.rows[0];
        
        // Update group current cycle
        await db.query(
          'UPDATE groups SET current_cycle = $1 WHERE id = $2',
          [parseInt(cycle.cycle_number) + 1, groupId]
        );
        
        // Create pending contributions for all members in new cycle
        const contributionsQuery = `
          INSERT INTO contributions (user_id, cycle_id, amount, method, status, created_at)
          SELECT m.user_id, $1, $2, 'pending', NOW()
          FROM members m
          WHERE m.group_id = $3 AND m.status = 'active'
        `;
        
        await db.query(contributionsQuery, [nextCycle.id, cycle.contribution_amount, groupId]);
      }
      
      await db.query('COMMIT');
      
      // Send SMS to recipient
      try {
        await sendSMS(
          phone,
          `Congratulations! Your payout of Rwf ${cycle.contribution_amount * parseInt(total_members)} from ${cycle.group_name} has been sent to ${phone}.`
        );
      } catch (smsError) {
        console.error('Failed to send payout SMS:', smsError);
      }
      
      res.json({
        payout: {
          id: payout.id,
          recipientPhone: payout.recipient_phone,
          amount: parseFloat(payout.amount)
        },
        nextCycle: nextCycle ? {
          id: nextCycle.id,
          cycleNumber: nextCycle.cycle_number
        } : null
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error confirming payout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/payouts/history/:groupId
// Return all completed payouts for a group
router.get('/history/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const query = `
      SELECT 
        p.id,
        p.recipient_phone,
        p.amount,
        p.method,
        p.status,
        p.created_at,
        c.cycle_number,
        g.name as group_name
      FROM payouts p
      JOIN cycles c ON p.cycle_id = c.id
      JOIN groups g ON c.group_id = g.id
      WHERE p.group_id = $1
      ORDER BY p.created_at DESC
    `;
    
    const result = await db.query(query, [groupId]);
    
    const payouts = result.rows.map(payout => ({
      id: payout.id,
      recipientPhone: payout.recipient_phone,
      amount: parseFloat(payout.amount),
      method: payout.method,
      status: payout.status,
      createdAt: payout.created_at,
      cycleNumber: payout.cycle_number,
      groupName: payout.group_name
    }));
    
    res.json(payouts);
    
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payouts/my-payouts
// Return all payouts received by logged in user
router.get('/my-payouts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        p.id,
        p.recipient_phone,
        p.amount,
        p.method,
        p.status,
        p.created_at,
        c.cycle_number,
        g.name as group_name
      FROM payouts p
      JOIN cycles c ON p.cycle_id = c.id
      JOIN groups g ON c.group_id = g.id
      WHERE p.recipient_phone = (SELECT phone FROM users WHERE id = $1)
      ORDER BY p.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    const payouts = result.rows.map(payout => ({
      id: payout.id,
      recipientPhone: payout.recipient_phone,
      amount: parseFloat(payout.amount),
      method: payout.method,
      status: payout.status,
      createdAt: payout.created_at,
      cycleNumber: payout.cycle_number,
      groupName: payout.group_name
    }));
    
    res.json(payouts);
    
  } catch (error) {
    console.error('Error fetching user payouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
