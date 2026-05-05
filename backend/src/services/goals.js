const db = require('../db');

// Goals service for linking savings goals to group contributions
class GoalsService {
  // Update goal progress when user makes a contribution
  static async updateGoalProgress(userId, groupId, amount) {
    try {
      // Find active goals for this user in this group
      const goalsQuery = `
        SELECT id, target_amount, current_amount 
        FROM goals 
        WHERE user_id = $1 AND group_id = $2 AND status = 'active'
      `;
      const goalsResult = await db.query(goalsQuery, [userId, groupId]);
      
      if (goalsResult.rows.length === 0) {
        return; // No active goals for this group
      }
      
      // Update each goal's progress
      for (const goal of goalsResult.rows) {
        const newCurrentAmount = Math.min(
          parseInt(goal.current_amount) + parseInt(amount),
          parseInt(goal.target_amount)
        );
        
        await db.query(`
          UPDATE goals 
          SET current_amount = $1, updated_at = NOW()
          WHERE id = $2
        `, [newCurrentAmount, goal.id]);
        
        // Check if goal is completed
        if (newCurrentAmount >= goal.target_amount) {
          await db.query(
            'UPDATE goals SET status = $1 WHERE id = $2',
            ['completed', goal.id]
          );
        }
      }
      
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }
  
  // Get goals summary for dashboard
  static async getGoalsSummary(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_goals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
          SUM(target_amount) as total_target_amount,
          SUM(current_amount) as total_current_amount
        FROM goals 
        WHERE user_id = $1
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows[0] || {
        total_goals: 0,
        completed_goals: 0,
        active_goals: 0,
        total_target_amount: 0,
        total_current_amount: 0
      };
    } catch (error) {
      console.error('Error getting goals summary:', error);
      return null;
    }
  }
  
  // Get goals with progress for a specific group
  static async getGroupGoals(userId, groupId) {
    try {
      const query = `
        SELECT 
          g.id,
          g.name,
          g.emoji,
          g.target_amount,
          g.current_amount,
          g.target_date,
          g.status,
          g.created_at,
          g.updated_at,
          CASE 
            WHEN g.target_amount > 0 
            THEN ROUND((g.current_amount / g.target_amount) * 100) 
            ELSE 0 
          END as progress_percentage
        FROM goals g
        WHERE g.user_id = $1 AND g.group_id = $2
        ORDER BY g.created_at DESC
      `;
      
      const result = await db.query(query, [userId, groupId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting group goals:', error);
      return [];
    }
  }
}

module.exports = GoalsService;
