const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { 
  initiateMoMoPayment, 
  initiateAirtelPayment, 
  checkMoMoStatus, 
  checkAirtelStatus,
  validatePhoneNumber,
  formatPhoneNumber,
  generatePaymentReference
} = require('../services/momo');

// POST /api/payments/initiate — Initiate payment
router.post('/initiate', auth, async (req, res) => {
  const { groupId, cycleId, method, phone } = req.body;
  
  if (!groupId || !cycleId || !method || !phone) {
    return res.status(400).json({ error: 'groupId, cycleId, method, and phone required' });
  }
  
  if (!['MTN_MOMO', 'AIRTEL_MONEY'].includes(method)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }
  
  const validPhone = validatePhoneNumber(phone);
  if (!validPhone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  try {
    // Verify user is member of group
    const member = await pool.query(
      'SELECT * FROM members WHERE group_id=$1 AND user_id=$2 AND status=$3',
      [groupId, req.userId, 'active']
    );
    if (!member.rows.length) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    
    // Verify contribution exists and is pending
    const contribution = await pool.query(
      'SELECT * FROM contributions WHERE id=$1 AND user_id=$2 AND status=$3',
      [cycleId, req.userId, 'pending']
    );
    if (!contribution.rows.length) {
      return res.status(404).json({ error: 'Contribution not found or already paid' });
    }
    
    const contrib = contribution.rows[0];
    
    // Create transaction record
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const transaction = await client.query(
        `INSERT INTO transactions (contribution_id, group_id, user_id, amount, method, phone, provider_ref, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [contrib.id, groupId, req.userId, contrib.amount, method, validPhone, null, 'pending']
      );
      
      const transactionRecord = transaction.rows[0];
      
      // Initiate payment with provider
      let paymentResult;
      const reference = generatePaymentReference();
      
      if (method === 'MTN_MOMO') {
        paymentResult = await initiateMoMoPayment({
          phone: validPhone,
          amount: contrib.amount,
          reference
        });
      } else {
        paymentResult = await initiateAirtelPayment({
          phone: validPhone,
          amount: contrib.amount,
          reference
        });
      }
      
      // Update transaction with provider reference
      await client.query(
        'UPDATE transactions SET provider_ref=$1 WHERE id=$2',
        [paymentResult.referenceId, transactionRecord.id]
      );
      
      await client.query('COMMIT');
      
      res.json({
        transactionId: transactionRecord.id,
        status: 'pending',
        message: paymentResult.message,
        providerRef: paymentResult.referenceId
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/confirm — Confirm payment
router.post('/confirm', auth, async (req, res) => {
  const { transactionId, providerRef } = req.body;
  
  if (!transactionId || !providerRef) {
    return res.status(400).json({ error: 'transactionId and providerRef required' });
  }
  
  try {
    // Get transaction
    const transaction = await pool.query(
      'SELECT * FROM transactions WHERE id=$1 AND user_id=$2',
      [transactionId, req.userId]
    );
    
    if (!transaction.rows.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const trans = transaction.rows[0];
    
    if (trans.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }
    
    // Check payment status with provider
    let paymentStatus;
    if (trans.method === 'MTN_MOMO') {
      paymentStatus = await checkMoMoStatus(providerRef);
    } else {
      paymentStatus = await checkAirtelStatus(providerRef);
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (paymentStatus.status === 'SUCCESSFUL') {
        // Update transaction status
        await client.query(
          'UPDATE transactions SET status=$1, completed_at=$2 WHERE id=$3',
          ['completed', new Date(), transactionId]
        );
        
        // Update contribution status
        await client.query(
          'UPDATE contributions SET status=$1, paid_at=$2, method=$3 WHERE id=$4',
          ['paid', new Date(), trans.method, trans.contribution_id]
        );
        
        await client.query('COMMIT');
        
        // Get updated contribution
        const contribution = await pool.query('SELECT * FROM contributions WHERE id=$1', [trans.contribution_id]);
        
        res.json({
          status: 'completed',
          message: 'Payment confirmed successfully',
          contribution: contribution.rows[0]
        });
        
      } else if (paymentStatus.status === 'FAILED') {
        // Update transaction status
        await client.query(
          'UPDATE transactions SET status=$1 WHERE id=$2',
          ['failed', transactionId]
        );
        
        await client.query('COMMIT');
        
        res.status(400).json({
          status: 'failed',
          message: 'Payment failed. Please try again.'
        });
        
      } else {
        // Still pending
        await client.query('ROLLBACK');
        res.json({
          status: 'pending',
          message: 'Payment is still being processed...'
        });
      }
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Payment confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/history — Get user's payment history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await pool.query(`
      SELECT t.*, g.name as group_name, g.emoji as group_emoji, c.cycle_number
      FROM transactions t
      JOIN groups g ON g.id = t.group_id
      JOIN contributions c ON c.id = t.contribution_id
      JOIN cycles cy ON cy.id = c.cycle_id
      WHERE t.user_id = $1
      ORDER BY t.initiated_at DESC
      LIMIT 50
    `, [req.userId]);
    
    res.json(history.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/transaction/:id — Get transaction details
router.get('/transaction/:id', auth, async (req, res) => {
  try {
    const transaction = await pool.query(`
      SELECT t.*, g.name as group_name, g.emoji as group_emoji
      FROM transactions t
      JOIN groups g ON g.id = t.group_id
      WHERE t.id = $1 AND t.user_id = $2
    `, [req.params.id, req.userId]);
    
    if (!transaction.rows.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook/momo — MTN MoMo webhook (for real integration)
router.post('/webhook/momo', async (req, res) => {
  // This endpoint would be called by MTN MoMo API
  // Implement webhook verification and processing here
  // For now, just return success
  res.json({ status: 'received' });
});

// POST /api/payments/webhook/airtel — Airtel Money webhook (for real integration)
router.post('/webhook/airtel', async (req, res) => {
  // This endpoint would be called by Airtel Money API
  // Implement webhook verification and processing here
  // For now, just return success
  res.json({ status: 'received' });
});

module.exports = router;
