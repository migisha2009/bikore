const express = require('express');
const router = express.Router();
const ReferralService = require('../services/referral');
const { authenticateToken } = require('../middleware/auth');

// GET /api/referrals/my-code — get user's referral code
router.get('/my-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create referral code
    let referralCode = await ReferralService.getReferralCode(userId);
    
    if (!referralCode) {
      referralCode = await ReferralService.createReferralCode(userId);
    }
    
    res.json(referralCode);
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/referrals/apply — apply referral code during registration
router.post('/apply', async (req, res) => {
  try {
    const { referralCode, userId } = req.body;
    
    if (!referralCode || !userId) {
      return res.status(400).json({ error: 'Referral code and user ID are required' });
    }
    
    const result = await ReferralService.processReferral(referralCode, userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/credits/balance — get user's credits balance
router.get('/credits/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await ReferralService.getCreditsBalance(userId);
    
    res.json({ balance });
  } catch (error) {
    console.error('Error getting credits balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/credits/history — get user's credits history
router.get('/credits/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const history = await ReferralService.getCreditsHistory(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json(history);
  } catch (error) {
    console.error('Error getting credits history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/referrals/credits/use — use credits for contribution
router.post('/credits/use', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, contributionId } = req.body;
    
    if (!amount || !contributionId) {
      return res.status(400).json({ error: 'Amount and contribution ID are required' });
    }
    
    const result = await ReferralService.useCredits(userId, parseInt(amount), contributionId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error using credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/stats — get user's referral statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await ReferralService.getReferralStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
