const db = require('../db');

// Referral service for managing referral codes and credits
class ReferralService {
  // Generate a unique referral code
  static generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create referral code for a user
  static async createReferralCode(userId) {
    try {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if user already has a referral code
        const existingCode = await client.query(
          'SELECT id, code FROM referral_codes WHERE user_id = $1',
          [userId]
        );
        
        if (existingCode.rows.length > 0) {
          await client.query('COMMIT');
          return existingCode.rows[0];
        }
        
        // Generate unique code
        let code;
        let codeExists = true;
        let attempts = 0;
        
        while (codeExists && attempts < 10) {
          code = this.generateReferralCode();
          const checkResult = await client.query(
            'SELECT id FROM referral_codes WHERE code = $1',
            [code]
          );
          codeExists = checkResult.rows.length > 0;
          attempts++;
        }
        
        if (codeExists) {
          throw new Error('Failed to generate unique referral code');
        }
        
        // Create referral code
        const result = await client.query(
          'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) RETURNING id, code, created_at',
          [userId, code]
        );
        
        // Update user with referral code reference
        await client.query(
          'UPDATE users SET referral_code_id = $1 WHERE id = $2',
          [result.rows[0].id, userId]
        );
        
        await client.query('COMMIT');
        return result.rows[0];
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating referral code:', error);
      throw error;
    }
  }

  // Get user's referral code
  static async getReferralCode(userId) {
    try {
      const result = await db.query(`
        SELECT rc.id, rc.code, rc.created_at, rc.is_active
        FROM referral_codes rc
        WHERE rc.user_id = $1
      `, [userId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting referral code:', error);
      throw error;
    }
  }

  // Process referral when new user registers with referral code
  static async processReferral(referralCode, newUserId) {
    try {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Find referral code
        const codeResult = await client.query(
          'SELECT id, user_id as referrer_id FROM referral_codes WHERE code = $1 AND is_active = true',
          [referralCode]
        );
        
        if (codeResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return { success: false, error: 'Invalid referral code' };
        }
        
        const referralCodeData = codeResult.rows[0];
        const referrerId = referralCodeData.referrer_id;
        
        // Check if referral already exists
        const existingReferral = await client.query(
          'SELECT id FROM referrals WHERE referred_id = $1',
          [newUserId]
        );
        
        if (existingReferral.rows.length > 0) {
          await client.query('ROLLBACK');
          return { success: false, error: 'User already referred' };
        }
        
        // Create referral record
        const referralResult = await client.query(
          'INSERT INTO referrals (referrer_id, referred_id, referral_code_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
          [referrerId, newUserId, referralCodeData.id, 'completed']
        );
        
        // Award credits to referrer
        await client.query(
          'INSERT INTO credits (user_id, amount, type, description, reference_id) VALUES ($1, $2, $3, $4, $5)',
          [referrerId, 1000, 'referral', 'Referral bonus for inviting new user', referralResult.rows[0].id]
        );
        
        // Award credits to new user
        await client.query(
          'INSERT INTO credits (user_id, amount, type, description, reference_id) VALUES ($1, $2, $3, $4, $5)',
          [newUserId, 1000, 'referral', 'Welcome bonus for using referral code', referralResult.rows[0].id]
        );
        
        await client.query('COMMIT');
        return { success: true, message: 'Referral processed successfully' };
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing referral:', error);
      return { success: false, error: 'Failed to process referral' };
    }
  }

  // Get user's credits balance
  static async getCreditsBalance(userId) {
    try {
      const result = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'earned' OR type = 'referral' THEN amount ELSE -amount END), 0) as balance
        FROM credits 
        WHERE user_id = $1
      `, [userId]);
      
      return parseInt(result.rows[0].balance) || 0;
    } catch (error) {
      console.error('Error getting credits balance:', error);
      throw error;
    }
  }

  // Get user's credits history
  static async getCreditsHistory(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          amount,
          type,
          description,
          created_at
        FROM credits 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting credits history:', error);
      throw error;
    }
  }

  // Use credits for contribution
  static async useCredits(userId, amount, contributionId) {
    try {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check available credits
        const balanceResult = await client.query(
          'SELECT COALESCE(SUM(CASE WHEN type = \'earned\' OR type = \'referral\' THEN amount ELSE -amount END), 0) as balance FROM credits WHERE user_id = $1',
          [userId]
        );
        
        const availableBalance = parseInt(balanceResult.rows[0].balance) || 0;
        
        if (availableBalance < amount) {
          await client.query('ROLLBACK');
          return { success: false, error: 'Insufficient credits' };
        }
        
        // Record credit usage
        await client.query(
          'INSERT INTO credits (user_id, amount, type, description, reference_id) VALUES ($1, $2, $3, $4, $5)',
          [userId, amount, 'used', `Used for contribution ${contributionId}`, contributionId]
        );
        
        await client.query('COMMIT');
        return { success: true, message: 'Credits used successfully' };
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error using credits:', error);
      return { success: false, error: 'Failed to use credits' };
    }
  }

  // Get referral statistics
  static async getReferralStats(userId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1000 ELSE 0 END), 0) as earned_credits
        FROM referrals 
        WHERE referrer_id = $1
      `, [userId]);
      
      return result.rows[0] || {
        total_referrals: 0,
        completed_referrals: 0,
        earned_credits: 0
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      throw error;
    }
  }
}

module.exports = ReferralService;
