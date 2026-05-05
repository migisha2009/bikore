const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const paymentService = require('../services/payment');
const GoalsService = require('../services/goals');
const ReferralService = require('../services/referral');

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
    let query = `
      SELECT c.*, u.name, u.avatar_color, g.name as group_name, cy.cycle_number
      FROM contributions c 
      JOIN users u ON u.id=c.user_id
      JOIN groups g ON g.id=c.group_id
      JOIN cycles cy ON cy.id=c.cycle_id
      WHERE 1=1
    `;
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
  const { groupId, cycleId, method, useCredits = false, creditAmount = 0 } = req.body;
  if (!groupId || !cycleId || !method) return res.status(400).json({ error: 'groupId, cycleId, method required' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verify user is a member of the group
    const member = await client.query('SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3', [groupId, req.userId, 'active']);
    if (!member.rows.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get user and group details
    const [userResult, groupResult] = await Promise.all([
      client.query('SELECT phone FROM users WHERE id=$1', [req.userId]),
      client.query('SELECT contribution_amount, name FROM groups WHERE id=$1', [groupId])
    ]);
    
    if (!userResult.rows.length || !groupResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User or group not found' });
    }

    const user = userResult.rows[0];
    const group = groupResult.rows[0];
    const amount = group.contribution_amount;
    
    // Handle credit usage
    let creditUsed = 0;
    if (useCredits && creditAmount > 0) {
      // Check available credits
      const creditBalance = await ReferralService.getCreditsBalance(req.userId);
      
      if (creditBalance < creditAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient credits' });
      }
      
      if (creditAmount > amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Credit amount cannot exceed contribution amount' });
      }
      
      creditUsed = creditAmount;
    }

    // Check if already paid
    const existing = await client.query('SELECT * FROM contributions WHERE cycle_id=$1 AND user_id=$2', [cycleId, req.userId]);
    if (existing.rows.length) {
      if (existing.rows[0].status === 'paid') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Already paid for this cycle' });
      }
      // Update pending payment
      const { rows } = await client.query(
        'UPDATE contributions SET status=$1, paid_at=NOW(), method=$2 WHERE id=$3 RETURNING *',
        ['paid', method, existing.rows[0].id]
      );
      await client.query('COMMIT');
      return res.json(rows[0]);
    }

    // Validate phone number for the selected payment method
    const phoneValidation = paymentService.validatePhoneNumber(user.phone, method);
    if (!phoneValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: phoneValidation.error });
    }

    // Calculate actual payment amount after credits
    const paymentAmount = amount - creditUsed;
    
    // Process mobile money payment (only if payment amount > 0)
    let paymentResult = { success: true, transactionId: null };
    if (paymentAmount > 0) {
      paymentResult = await paymentService.processPayment(
        user.phone, 
        paymentAmount, 
        method, 
        `Contribution to ${group.name} - Cycle ${cycleId}`
      );
    }

    if (!paymentResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: paymentResult.error });
    }

    // Create contribution record
    const { rows } = await client.query(
      'INSERT INTO contributions (cycle_id,group_id,user_id,amount,method,status,paid_at,transaction_id) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7) RETURNING *',
      [cycleId, groupId, req.userId, amount, method, 'paid', paymentResult.transactionId]
    );

    await client.query('COMMIT');
    
    // Use credits if applicable
    if (creditUsed > 0) {
      await ReferralService.useCredits(req.userId, creditUsed, rows[0].id);
    }
    
    // Update goal progress after successful payment
    await GoalsService.updateGoalProgress(req.userId, groupId, amount);
    
    res.status(201).json({
      ...rows[0],
      transactionId: paymentResult.transactionId,
      creditUsed,
      paymentAmount,
      message: 'Payment processed successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
