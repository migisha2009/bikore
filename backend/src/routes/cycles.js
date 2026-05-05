const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendSMS } = require('../services/sms');
const { createNotificationRecords } = require('../services/push');

// GET /api/groups/:id/cycles
// Get all cycles for a group
router.get('/:id/cycles', authenticateToken, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    
    // Verify user is member of the group
    const memberCheck = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND group_id = $2 AND status = $3',
      [userId, groupId, 'active']
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = `
      SELECT 
        c.id,
        c.cycle_number,
        c.contribution_amount,
        c.start_date,
        c.end_date,
        c.status,
        c.payout_user_id,
        u.name as payout_recipient_name,
        u.avatar_color as payout_recipient_color,
        COUNT(co.id) as paid_count,
        COUNT(m.id) as total_members
      FROM cycles c
      LEFT JOIN users u ON c.payout_user_id = u.id
      LEFT JOIN contributions co ON c.id = co.cycle_id AND co.status = 'paid'
      LEFT JOIN members m ON c.group_id = m.group_id AND m.status = 'active'
      WHERE c.group_id = $1
      GROUP BY c.id, c.cycle_number, c.contribution_amount, c.start_date, c.end_date, c.status, c.payout_user_id, u.name, u.avatar_color
      ORDER BY c.cycle_number DESC
    `;
    
    const result = await db.query(query, [groupId]);
    
    const cycles = result.rows.map(cycle => ({
      id: cycle.id,
      cycleNumber: cycle.cycle_number,
      contributionAmount: parseFloat(cycle.contribution_amount),
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      status: cycle.status,
      payoutUserId: cycle.payout_user_id,
      payoutRecipientName: cycle.payout_recipient_name,
      payoutRecipientColor: cycle.payout_recipient_color,
      paidCount: parseInt(cycle.paid_count),
      totalMembers: parseInt(cycle.total_members),
      isComplete: parseInt(cycle.paid_count) === parseInt(cycle.total_members)
    }));
    
    res.json(cycles);
    
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/:id/cycles/current
// Get current active cycle
router.get('/:id/cycles/current', authenticateToken, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    
    // Verify user is member of the group
    const memberCheck = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND group_id = $2 AND status = $3',
      [userId, groupId, 'active']
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = `
      SELECT 
        c.id,
        c.cycle_number,
        c.contribution_amount,
        c.start_date,
        c.end_date,
        c.status,
        c.payout_user_id,
        u.name as payout_recipient_name,
        u.avatar_color as payout_recipient_color,
        COUNT(co.id) as paid_count,
        COUNT(m.id) as total_members,
        g.late_penalty
      FROM cycles c
      LEFT JOIN users u ON c.payout_user_id = u.id
      LEFT JOIN contributions co ON c.id = co.cycle_id AND co.status = 'paid'
      LEFT JOIN members m ON c.group_id = m.group_id AND m.status = 'active'
      LEFT JOIN groups g ON c.group_id = g.id
      WHERE c.group_id = $1 AND c.status = 'active'
      GROUP BY c.id, c.cycle_number, c.contribution_amount, c.start_date, c.end_date, c.status, c.payout_user_id, u.name, u.avatar_color, g.late_penalty
    `;
    
    const result = await db.query(query, [groupId]);
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    const cycle = result.rows[0];
    
    res.json({
      id: cycle.id,
      cycleNumber: cycle.cycle_number,
      contributionAmount: parseFloat(cycle.contribution_amount),
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      status: cycle.status,
      payoutUserId: cycle.payout_user_id,
      payoutRecipientName: cycle.payout_recipient_name,
      payoutRecipientColor: cycle.payout_recipient_color,
      paidCount: parseInt(cycle.paid_count),
      totalMembers: parseInt(cycle.total_members),
      isComplete: parseInt(cycle.paid_count) === parseInt(cycle.total_members),
      latePenalty: parseInt(cycle.late_penalty || 0)
    });
    
  } catch (error) {
    console.error('Error fetching current cycle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/cycles/advance
// Advance to next cycle (admin only)
router.post('/:id/cycles/advance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const adminId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id, name, cycle_duration FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const groupName = adminCheck.rows[0].name;
    const cycleDuration = adminCheck.rows[0].cycle_duration;
    
    await db.query('BEGIN');
    
    try {
      // Get current cycle
      const currentCycleQuery = `
        SELECT 
          id,
          cycle_number,
          contribution_amount,
          payout_user_id
        FROM cycles 
        WHERE group_id = $1 AND status = 'active'
      `;
      
      const currentCycleResult = await db.query(currentCycleQuery, [groupId]);
      
      if (currentCycleResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: 'No active cycle found' });
      }
      
      const currentCycle = currentCycleResult.rows[0];
      
      // Mark current cycle as completed
      await db.query(
        'UPDATE cycles SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', currentCycle.id]
      );
      
      // Get next member in rotation
      const nextMemberQuery = `
        SELECT m.user_id, m.position
        FROM members m
        WHERE m.group_id = $1 AND m.status = 'active'
        ORDER BY m.position ASC
        LIMIT 1 OFFSET $2
      `;
      
      const nextMemberResult = await db.query(nextMemberQuery, [groupId, currentCycle.cycle_number]);
      const nextMember = nextMemberResult.rows[0];
      
      if (!nextMember) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: 'No next member found for payout' });
      }
      
      // Get group details for penalty calculation
      const groupQuery = `
        SELECT g.late_penalty, g.contribution_amount
        FROM groups g
        WHERE g.id = $1
      `;
      
      const groupResult = await db.query(groupQuery, [groupId]);
      const group = groupResult.rows[0];
      const latePenalty = group?.late_penalty || 0;
      
      // Create next cycle
      const newCycleQuery = `
        INSERT INTO cycles (
          group_id, 
          cycle_number, 
          contribution_amount, 
          start_date, 
          end_date, 
          status, 
          payout_user_id
        ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${cycleDuration}', 'active', $4)
        RETURNING id, cycle_number
      `;
      
      const newCycleResult = await db.query(newCycleQuery, [
        groupId,
        parseInt(currentCycle.cycle_number) + 1,
        currentCycle.contribution_amount,
        nextMember.user_id
      ]);
      
      const newCycle = newCycleResult.rows[0];
      
      // Update group current cycle
      await db.query(
        'UPDATE groups SET current_cycle = $1 WHERE id = $2',
        [newCycle.cycle_number, groupId]
      );
      
      // Create pending contributions for all members
      const contributionsQuery = `
        INSERT INTO contributions (user_id, cycle_id, amount, method, status, created_at)
        SELECT m.user_id, $1 + $2, 'pending', NOW()
        FROM members m
        WHERE m.group_id = $3 AND m.status = 'active'
      `;
      
      await db.query(contributionsQuery, [newCycle.id, currentCycle.contribution_amount + latePenalty, groupId]);
      
      // Get all active members for SMS
      const membersQuery = `
        SELECT u.name, u.phone
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = $1 AND m.status = 'active'
      `;
      
      const membersResult = await db.query(membersQuery, [groupId]);
      
      await db.query('COMMIT');
      
      // Send SMS notifications to all members
      const notifications = membersResult.rows.map(member => ({
        type: 'new_cycle_started',
        title: 'New Cycle Started',
        body: `Cycle ${newCycle.cycle_number} has started in ${groupName}. Your contribution of Rwf ${currentCycle.contribution_amount} is due by ${new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        data: {
          groupId,
          cycleNumber: newCycle.cycle_number,
          contributionAmount: currentCycle.contribution_amount,
          dueDate: new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toISOString()
        }
      }));
      
      // Create notification records
      for (const member of membersResult.rows) {
        await createNotificationRecords({
          userId: member.phone, // Using phone as identifier
          notifications: [{
            type: 'new_cycle_started',
            title: 'New Cycle Started',
            body: `Cycle ${newCycle.cycle_number} has started in ${groupName}. Your contribution of Rwf ${currentCycle.contribution_amount} is due by ${new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
            data: {
              groupId,
              cycleNumber: newCycle.cycle_number,
              contributionAmount: currentCycle.contribution_amount,
              dueDate: new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toISOString()
            }
          }]
        });
      }
      
      // Send SMS to all members
      for (const member of membersResult.rows) {
        try {
          await sendSMS(
            member.phone,
            `Cycle ${newCycle.cycle_number} has started in ${groupName}. Your contribution of Rwf ${currentCycle.contribution_amount} is due by ${new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toLocaleDateString()}.`
          );
        } catch (smsError) {
          console.error(`Failed to send SMS to ${member.name}:`, smsError);
        }
      }
      
      // Check if this was the final cycle
      const totalCyclesQuery = 'SELECT COUNT(*) as total FROM cycles WHERE group_id = $1';
      const totalCyclesResult = await db.query(totalCyclesQuery, [groupId]);
      const totalCycles = parseInt(totalCyclesResult.rows[0].total);
      
      if (newCycle.cycle_number >= totalCycles) {
        // Mark group as completed
        await db.query(
          'UPDATE groups SET status = $1, completed_at = NOW() WHERE id = $2',
          ['completed', groupId]
        );
      }
      
      res.json({
        message: 'Cycle advanced successfully',
        previousCycle: {
          id: currentCycle.id,
          cycleNumber: currentCycle.cycle_number,
          status: 'completed'
        },
        newCycle: {
          id: newCycle.id,
          cycleNumber: newCycle.cycle_number,
          payoutUserId: nextMember.user_id,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + parseInt(cycleDuration) * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error advancing cycle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error in cycle advance transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/cycles/:cycleId/complete
// Manually complete a cycle (admin only)
router.post('/:id/cycles/:cycleId/complete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: groupId, cycleId } = req.params;
    const adminId = req.user.id;
    
    // Verify admin permissions
    const adminCheck = await db.query(
      'SELECT admin_id FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (adminCheck.rows[0]?.admin_id !== adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Mark cycle as completed
    await db.query(
      'UPDATE cycles SET status = $1, completed_at = NOW() WHERE id = $2 AND group_id = $3',
      ['completed', cycleId, groupId]
    );
    
    res.json({ message: 'Cycle marked as completed' });
    
  } catch (error) {
    console.error('Error completing cycle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
