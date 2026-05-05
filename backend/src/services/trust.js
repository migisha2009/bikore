const db = require('../db');

// Trust score calculation service
class TrustScoreService {
  // Calculate trust score based on user behavior
  static calculateTrustScore(userId, groupId) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await db.connect();
        
        try {
          await client.query('BEGIN');
          
          // Get user's payment history
          const paymentHistory = await client.query(`
            SELECT 
              COUNT(*) as total_payments,
              COUNT(CASE WHEN status = 'paid' AND paid_at <= NOW() - INTERVAL '30 days' THEN 1 END) as recent_payments,
              COUNT(CASE WHEN status = 'paid' AND paid_at > NOW() - INTERVAL '30 days' THEN 1 END) as older_payments,
              COUNT(CASE WHEN status = 'pending' AND created_at <= NOW() - INTERVAL '7 days' THEN 1 END) as recent_late_payments,
              COUNT(CASE WHEN status = 'pending' AND created_at > NOW() - INTERVAL '7 days' THEN 1 END) as older_late_payments,
              COUNT(CASE WHEN status = 'failed' AND created_at <= NOW() - INTERVAL '30 days' THEN 1 END) as recent_failed_payments,
              COUNT(CASE WHEN status = 'failed' AND created_at > NOW() - INTERVAL '30 days' THEN 1 END) as older_failed_payments
            FROM contributions co
            JOIN cycles c ON co.cycle_id = c.id
            WHERE co.user_id = $1 AND c.group_id = $2
          `, [userId, groupId]);
          
          const payments = paymentHistory.rows[0];
          
          // Calculate base score (starts at 100)
          let score = 100;
          
          // Deduct points for late payments
          const latePayments = parseInt(payments.recent_late_payments || 0);
          score -= (latePayments * 5);
          
          // Deduct points for older late payments
          const olderLatePayments = parseInt(payments.older_late_payments || 0);
          score -= (olderLatePayments * 3);
          
          // Deduct points for failed payments
          const recentFailedPayments = parseInt(payments.recent_failed_payments || 0);
          score -= (recentFailedPayments * 10);
          
          // Deduct points for older failed payments
          const olderFailedPayments = parseInt(payments.older_failed_payments || 0);
          score -= (olderFailedPayments * 5);
          
          // Bonus points for on-time payments
          const onTimePayments = parseInt(payments.total_payments || 0) - latePayments - olderLatePayments;
          score += (onTimePayments * 2);
          
          // Bonus points for completed cycles
          const completedCycles = await client.query(`
            SELECT COUNT(*) as completed_cycles
            FROM cycles c
            WHERE c.group_id = $1 AND c.status = 'completed'
          `, [groupId]);
          
          const completedCount = parseInt(completedCycles.rows[0]?.completed_cycles || 0);
          score += (completedCount * 20);
          
          // Ensure score stays within bounds (0-100)
          score = Math.max(0, Math.min(100, score));
          
          // Update user's trust score
          await client.query(
            'UPDATE users SET trust_score = $1 WHERE id = $2',
            [score, userId]
          );
          
          await client.query('COMMIT');
          resolve(score);
          
        } catch (error) {
          await client.query('ROLLBACK');
          reject(error);
        } finally {
          client.release();
        }
      });
    });
  }
  
  // Get trust score for a user
  static async getTrustScore(userId) {
    try {
      const result = await db.query(
        'SELECT trust_score FROM users WHERE id = $1',
        [userId]
      );
      
      return result.rows[0]?.trust_score || 100;
    } catch (error) {
      console.error('Error getting trust score:', error);
      return 100;
    }
  }
  
  // Update trust score after payment
  static async updateTrustScoreAfterPayment(userId, groupId, paymentStatus) {
    try {
      const currentScore = await this.getTrustScore(userId);
      let newScore = currentScore;
      
      if (paymentStatus === 'paid') {
        newScore = Math.min(100, currentScore + 2);
      } else if (paymentStatus === 'late') {
        newScore = Math.max(0, currentScore - 5);
      } else if (paymentStatus === 'failed') {
        newScore = Math.max(0, currentScore - 10);
      }
      
      await db.query(
        'UPDATE users SET trust_score = $1 WHERE id = $2',
        [newScore, userId]
      );
      
      return newScore;
    } catch (error) {
      console.error('Error updating trust score:', error);
      return currentScore;
    }
  }
}

module.exports = TrustScoreService;
