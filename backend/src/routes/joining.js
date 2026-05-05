const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendSMS } = require('../services/sms');

// Helper function to generate invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/groups/preview/:inviteCode
// No auth required - find group by invite code
router.get('/preview/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    
    // Find group by invite code
    const groupQuery = `
      SELECT g.*, 
             u.name as admin_name,
             COUNT(m.id) as member_count
      FROM groups g
      LEFT JOIN users u ON g.admin_id = u.id
      LEFT JOIN members m ON g.id = m.group_id AND m.status = 'active'
      WHERE g.invite_code = $1 AND g.invite_expires_at > NOW()
      GROUP BY g.id, u.name
    `;
    
    const groupResult = await db.query(groupQuery, [inviteCode.toUpperCase()]);
    
    if (groupResult.rows.length === 0) {
      // Check if invite code exists but expired
      const expiredQuery = `
        SELECT id, name FROM groups 
        WHERE invite_code = $1 AND invite_expires_at <= NOW()
      `;
      const expiredResult = await db.query(expiredQuery, [inviteCode.toUpperCase()]);
      
      if (expiredResult.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Invite code has expired. Ask admin for a new one.' 
        });
      }
      
      return res.status(404).json({ 
        error: 'Invalid invite code' 
      });
    }
    
    const group = groupResult.rows[0];
    
    // Return group preview data
    res.json({
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      description: group.description,
      contribution_amount: group.contribution_amount,
      cycle_duration: group.cycle_duration,
      total_cycles: group.total_cycles,
      max_members: group.max_members,
      member_count: parseInt(group.member_count),
      rules: group.rules,
      requires_approval: group.requires_approval,
      admin_name: group.admin_name
    });
    
  } catch (error) {
    console.error('Error previewing group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/request-join
// Auth required - request to join a group
router.post('/request-join', authenticateToken, async (req, res) => {
  try {
    const { inviteCode, message, agreedToRules } = req.body;
    const userId = req.user.id;
    
    // Validate agreedToRules
    if (!agreedToRules) {
      return res.status(400).json({ 
        error: 'You must agree to the group rules to join' 
      });
    }
    
    // Validate message (reason) - minimum 20 characters
    if (message && message.length < 20) {
      return res.status(400).json({ 
        error: 'Reason must be at least 20 characters long' 
      });
    }
    
    // Validate invite code format
    if (!inviteCode || inviteCode.length !== 8) {
      return res.status(400).json({ 
        error: 'Invalid invite code format' 
      });
    }
    
    // Find and validate group
    const groupQuery = `
      SELECT g.*, COUNT(m.id) as member_count
      FROM groups g
      LEFT JOIN members m ON g.id = m.group_id AND m.status = 'active'
      WHERE g.invite_code = $1 AND g.invite_expires_at > NOW()
      GROUP BY g.id
    `;
    
    const groupResult = await db.query(groupQuery, [inviteCode.toUpperCase()]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Invalid or expired invite code' 
      });
    }
    
    const group = groupResult.rows[0];
    const memberCount = parseInt(group.member_count);
    
    // Check if group is full
    if (memberCount >= group.max_members) {
      return res.status(400).json({ 
        error: 'Group is full' 
      });
    }
    
    // Check if user is already a member
    const existingMemberQuery = `
      SELECT id, status FROM members 
      WHERE group_id = $1 AND user_id = $2
    `;
    const existingMemberResult = await db.query(existingMemberQuery, [group.id, userId]);
    
    if (existingMemberResult.rows.length > 0) {
      const existingMember = existingMemberResult.rows[0];
      if (existingMember.status === 'active') {
        return res.status(400).json({ 
          error: 'You are already a member of this group' 
        });
      } else if (existingMember.status === 'pending') {
        return res.status(400).json({ 
          error: 'You already have a pending request to join this group' 
        });
      }
    }
    
    // Check for existing pending request
    const existingRequestQuery = `
      SELECT id FROM member_requests 
      WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
    `;
    const existingRequestResult = await db.query(existingRequestQuery, [group.id, userId]);
    
    if (existingRequestResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You already have a pending request to join this group' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      if (group.requires_approval) {
        // Create member request
        const requestQuery = `
          INSERT INTO member_requests (group_id, user_id, message, status, requested_at)
          VALUES ($1, $2, $3, 'pending', NOW())
          RETURNING id
        `;
        const requestResult = await db.query(requestQuery, [group.id, userId, message || '']);
        const requestId = requestResult.rows[0].id;
        
        // Save agreement
        const agreementQuery = `
          INSERT INTO member_agreements (group_id, user_id, agreed_at, agreed_to_rules)
          VALUES ($1, $2, NOW(), $3)
        `;
        await db.query(agreementQuery, [group.id, userId, agreedToRules]);
        
        await db.query('COMMIT');
        
        res.json({
          message: 'Join request sent successfully',
          requestId: requestId,
          requiresApproval: true
        });
        
      } else {
        // Add directly to members
        // Get next position
        const positionQuery = `
          SELECT COALESCE(MAX(position), 0) + 1 as next_position
          FROM members 
          WHERE group_id = $1 AND status = 'active'
        `;
        const positionResult = await db.query(positionQuery, [group.id]);
        const nextPosition = positionResult.rows[0].next_position;
        
        // Add member
        const memberQuery = `
          INSERT INTO members (group_id, user_id, position, status, joined_at)
          VALUES ($1, $2, $3, 'active', NOW())
          RETURNING id, position
        `;
        const memberResult = await db.query(memberQuery, [group.id, userId, nextPosition]);
        
        // Save agreement
        const agreementQuery = `
          INSERT INTO member_agreements (group_id, user_id, agreed_at, agreed_to_rules)
          VALUES ($1, $2, NOW(), $3)
        `;
        await db.query(agreementQuery, [group.id, userId, agreedToRules]);
        
        await db.query('COMMIT');
        
        // Send welcome SMS
        try {
          await sendSMS(
            req.user.phone,
            `Congratulations! You have successfully joined "${group.name}" on Bikore. Your position is #${nextPosition}.`
          );
        } catch (smsError) {
          console.error('Failed to send welcome SMS:', smsError);
        }
        
        res.json({
          message: 'Successfully joined the group',
          memberId: memberResult.rows[0].id,
          position: nextPosition,
          requiresApproval: false
        });
      }
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error requesting to join group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/:id/requests
// Admin only - get pending requests
router.get('/:id/requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Verify user is admin of this group
    const adminCheckQuery = `
      SELECT admin_id FROM groups WHERE id = $1
    `;
    const adminCheckResult = await db.query(adminCheckQuery, [id]);
    
    if (adminCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (adminCheckResult.rows[0].admin_id !== adminId) {
      return res.status(403).json({ error: 'Only admin can view requests' });
    }
    
    // Get pending requests
    const query = `
      SELECT mr.id, u.name, u.phone, mr.message,
             mr.requested_at as requested_at,
             mr.status as status
      FROM member_requests mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.group_id = $1 AND mr.status = 'pending'
      ORDER BY mr.requested_at DESC
    `;
    
    const result = await db.query(query, [id]);
    
    const requests = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      message: row.message,
      requested_at: row.requested_at,
      status: row.status
    }));
    
    res.json(requests);
    
  } catch (error) {
    console.error('Error getting group requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/requests/:requestId/approve
// Admin only - approve a join request
router.post('/:id/requests/:requestId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const adminId = req.user.id;
    
    // Verify user is admin of this group
    const adminCheckQuery = `
      SELECT admin_id, name FROM groups WHERE id = $1
    `;
    const adminCheckResult = await db.query(adminCheckQuery, [id]);
    
    if (adminCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (adminCheckResult.rows[0].admin_id !== adminId) {
      return res.status(403).json({ error: 'Only admin can approve requests' });
    }
    
    const groupName = adminCheckResult.rows[0].name;
    
    await db.query('BEGIN');
    
    try {
      // Get request details
      const requestQuery = `
        SELECT mr.user_id, u.name, u.phone
        FROM member_requests mr
        JOIN users u ON mr.user_id = u.id
        WHERE mr.id = $1 AND mr.group_id = $2 AND mr.status = 'pending'
      `;
      const requestResult = await db.query(requestQuery, [requestId, id]);
      
      if (requestResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found or already processed' });
      }
      
      const requestUser = requestResult.rows[0];
      
      // Get next position
      const positionQuery = `
        SELECT COALESCE(MAX(position), 0) + 1 as next_position
        FROM members 
        WHERE group_id = $1 AND status = 'active'
      `;
      const positionResult = await db.query(positionQuery, [id]);
      const nextPosition = positionResult.rows[0].next_position;
      
      // Update request status
      const updateRequestQuery = `
        UPDATE member_requests 
        SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
        WHERE id = $2
      `;
      await db.query(updateRequestQuery, [adminId, requestId]);
      
      // Add user to members
      const memberQuery = `
        INSERT INTO members (group_id, user_id, position, status, joined_at)
        VALUES ($1, $2, $3, 'active', NOW())
        RETURNING id, position
      `;
      const memberResult = await db.query(memberQuery, [id, requestUser.user_id, nextPosition]);
      
      await db.query('COMMIT');
      
      // Send approval SMS
      try {
        await sendSMS(
          requestUser.phone,
          `Congratulations! Your request to join "${groupName}" on Bikore has been approved.`
        );
      } catch (smsError) {
        console.error('Failed to send approval SMS:', smsError);
      }
      
      res.json({
        message: 'Member approved successfully',
        member: {
          id: memberResult.rows[0].id,
          name: requestUser.name,
          position: nextPosition
        }
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/requests/:requestId/reject
// Admin only - reject a join request
router.post('/:id/requests/:requestId/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const adminId = req.user.id;
    
    // Verify user is admin of this group
    const adminCheckQuery = `
      SELECT admin_id, name FROM groups WHERE id = $1
    `;
    const adminCheckResult = await db.query(adminCheckQuery, [id]);
    
    if (adminCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (adminCheckResult.rows[0].admin_id !== adminId) {
      return res.status(403).json({ error: 'Only admin can reject requests' });
    }
    
    const groupName = adminCheckResult.rows[0].name;
    
    // Get request details
    const requestQuery = `
      SELECT mr.user_id, u.name, u.phone
      FROM member_requests mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.id = $1 AND mr.group_id = $2 AND mr.status = 'pending'
    `;
    const requestResult = await db.query(requestQuery, [requestId, id]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }
    
    const requestUser = requestResult.rows[0];
    
    // Update request status
    const updateRequestQuery = `
      UPDATE member_requests 
      SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1
      WHERE id = $2
    `;
    await db.query(updateRequestQuery, [adminId, requestId]);
    
    // Send rejection SMS
    try {
      await sendSMS(
        requestUser.phone,
        `Your request to join "${groupName}" on Bikore was not approved this time.`
      );
    } catch (smsError) {
      console.error('Failed to send rejection SMS:', smsError);
    }
    
    res.json({ message: 'Request rejected successfully' });
    
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/regenerate-invite
// Admin only - regenerate invite code
router.post('/:id/regenerate-invite', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Verify user is admin of this group
    const adminCheckQuery = `
      SELECT admin_id FROM groups WHERE id = $1
    `;
    const adminCheckResult = await db.query(adminCheckQuery, [id]);
    
    if (adminCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (adminCheckResult.rows[0].admin_id !== adminId) {
      return res.status(403).json({ error: 'Only admin can regenerate invite code' });
    }
    
    // Generate new invite code and set expiry
    const newInviteCode = generateInviteCode();
    const updateQuery = `
      UPDATE groups 
      SET invite_code = $1, invite_expires_at = NOW() + INTERVAL '48 hours'
      WHERE id = $2
      RETURNING invite_code, invite_expires_at
    `;
    
    const result = await db.query(updateQuery, [newInviteCode, id]);
    const updatedGroup = result.rows[0];
    
    res.json({
      inviteCode: updatedGroup.invite_code,
      expiresAt: updatedGroup.invite_expires_at
    });
    
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id/members/:userId
// Admin only - remove a member
router.delete('/:id/members/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const adminId = req.user.id;
    
    // Cannot remove self
    if (userId === adminId) {
      return res.status(400).json({ error: 'Admin cannot remove themselves' });
    }
    
    // Verify user is admin of this group
    const adminCheckQuery = `
      SELECT admin_id, name FROM groups WHERE id = $1
    `;
    const adminCheckResult = await db.query(adminCheckQuery, [id]);
    
    if (adminCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (adminCheckResult.rows[0].admin_id !== adminId) {
      return res.status(403).json({ error: 'Only admin can remove members' });
    }
    
    const groupName = adminCheckResult.rows[0].name;
    
    // Check if member exists and is active
    const memberQuery = `
      SELECT m.*, u.name, u.phone
      FROM members m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = $1 AND m.user_id = $2 AND m.status = 'active'
    `;
    const memberResult = await db.query(memberQuery, [id, userId]);
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const member = memberResult.rows[0];
    
    // Check if member has paid contribution in current active cycle
    const contributionCheckQuery = `
      SELECT c.id
      FROM contributions c
      JOIN cycles cyc ON c.cycle_id = cyc.id
      WHERE cyc.group_id = $1 AND c.user_id = $2 AND cyc.status = 'active' AND c.status = 'paid'
      LIMIT 1
    `;
    const contributionCheckResult = await db.query(contributionCheckQuery, [id, userId]);
    
    if (contributionCheckResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot remove member who has paid contribution in current cycle' 
      });
    }
    
    // Update member status to removed
    const updateMemberQuery = `
      UPDATE members 
      SET status = 'removed', removed_at = NOW()
      WHERE group_id = $1 AND user_id = $2
    `;
    await db.query(updateMemberQuery, [id, userId]);
    
    // Send removal SMS
    try {
      await sendSMS(
        member.phone,
        `You have been removed from "${groupName}" on Bikore.`
      );
    } catch (smsError) {
      console.error('Failed to send removal SMS:', smsError);
    }
    
    res.json({ message: 'Member removed successfully' });
    
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
