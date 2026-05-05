const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/analytics/overview — get user's analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Total saved all time
    const totalSavedQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_saved
      FROM contributions 
      WHERE user_id = $1 AND status = 'paid'
    `;
    
    // Average monthly savings (last 6 months)
    const monthlySavingsQuery = `
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        SUM(amount) as monthly_total
      FROM contributions 
      WHERE user_id = $1 AND status = 'paid' 
        AND paid_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month DESC
    `;
    
    // On-time payment rate
    const onTimeRateQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_payments,
        COUNT(CASE WHEN status = 'paid' AND paid_at <= due_date THEN 1 END) as on_time_payments
      FROM contributions c
      JOIN cycles cy ON c.cycle_id = cy.id
      WHERE c.user_id = $1 AND c.status = 'paid'
    `;
    
    // Groups completed
    const completedGroupsQuery = `
      SELECT COUNT(*) as completed_groups
      FROM groups g
      JOIN members m ON g.id = m.group_id
      WHERE m.user_id = $1 
        AND m.status = 'active'
        AND g.status = 'completed'
    `;
    
    // Payment streak (consecutive on-time payments)
    const streakQuery = `
      WITH payment_dates AS (
        SELECT 
          DATE_TRUNC('month', c.paid_at) as payment_month,
          CASE WHEN c.paid_at <= cy.due_date THEN 1 ELSE 0 END as on_time
        FROM contributions c
        JOIN cycles cy ON c.cycle_id = cy.id
        WHERE c.user_id = $1 AND c.status = 'paid'
        ORDER BY payment_month DESC
      ),
      streak_groups AS (
        SELECT 
          payment_month,
          on_time,
          SUM(CASE WHEN on_time = 0 THEN 1 ELSE 0 END) OVER (
            ORDER BY payment_month DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as reset_count
        FROM payment_dates
      )
      SELECT 
        COUNT(*) as current_streak
      FROM streak_groups
      WHERE reset_count = 0 AND on_time = 1
    `;
    
    const [totalSaved, monthlySavings, onTimeRate, completedGroups, streak] = await Promise.all([
      db.query(totalSavedQuery, [userId]),
      db.query(monthlySavingsQuery, [userId]),
      db.query(onTimeRateQuery, [userId]),
      db.query(completedGroupsQuery, [userId]),
      db.query(streakQuery, [userId])
    ]);
    
    const totalSavedAmount = parseInt(totalSaved.rows[0]?.total_saved || 0);
    const monthlyData = monthlySavings.rows;
    const avgMonthlySavings = monthlyData.length > 0 
      ? Math.round(monthlyData.reduce((sum, item) => sum + parseInt(item.monthly_total), 0) / monthlyData.length)
      : 0;
    
    const totalPayments = parseInt(onTimeRate.rows[0]?.total_payments || 0);
    const onTimePayments = parseInt(onTimeRate.rows[0]?.on_time_payments || 0);
    const onTimeRatePercentage = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 0;
    
    const completedGroupsCount = parseInt(completedGroups.rows[0]?.completed_groups || 0);
    const currentStreak = parseInt(streak.rows[0]?.current_streak || 0);
    
    res.json({
      total_saved: totalSavedAmount,
      average_monthly_savings: avgMonthlySavings,
      on_time_payment_rate: onTimeRatePercentage,
      groups_completed: completedGroupsCount,
      payment_streak: currentStreak,
      monthly_breakdown: monthlyData
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/monthly-savings — get monthly savings for chart
router.get('/monthly-savings', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        SUM(amount) as amount
      FROM contributions 
      WHERE user_id = $1 AND status = 'paid' 
        AND paid_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month ASC
    `;
    
    const result = await db.query(query, [userId]);
    
    // Format for chart
    const chartData = result.rows.map(row => ({
      month: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: parseInt(row.amount)
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching monthly savings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/group-contributions — get contribution breakdown by group
router.get('/group-contributions', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        g.name as group_name,
        g.emoji as group_emoji,
        SUM(c.amount) as total_contributed
      FROM contributions c
      JOIN groups g ON c.group_id = g.id
      WHERE c.user_id = $1 AND c.status = 'paid'
      GROUP BY g.id, g.name, g.emoji
      ORDER BY total_contributed DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    // Format for pie chart
    const chartData = result.rows.map(row => ({
      name: row.group_name,
      emoji: row.group_emoji,
      value: parseInt(row.total_contributed)
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching group contributions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/savings-progress — get total savings over time for line chart
router.get('/savings-progress', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        SUM(amount) OVER (ORDER BY DATE_TRUNC('month', paid_at) ASC) as cumulative_savings
      FROM contributions 
      WHERE user_id = $1 AND status = 'paid'
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month ASC
    `;
    
    const result = await db.query(query, [userId]);
    
    // Format for line chart
    const chartData = result.rows.map(row => ({
      month: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      savings: parseInt(row.cumulative_savings)
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching savings progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/payment-streak — get detailed payment streak information
router.get('/payment-streak', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        DATE_TRUNC('month', c.paid_at) as payment_month,
        c.amount,
        CASE WHEN c.paid_at <= cy.due_date THEN true ELSE false END as on_time,
        EXTRACT(DAY FROM cy.due_date - c.paid_at) as days_late
      FROM contributions c
      JOIN cycles cy ON c.cycle_id = cy.id
      WHERE c.user_id = $1 AND c.status = 'paid'
      ORDER BY payment_month DESC
      LIMIT 12
    `;
    
    const result = await db.query(query, [userId]);
    
    // Calculate current streak
    let currentStreak = 0;
    for (const payment of result.rows) {
      if (payment.on_time) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    res.json({
      current_streak: currentStreak,
      recent_payments: result.rows.map(row => ({
        month: new Date(row.payment_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: parseInt(row.amount),
        on_time: row.on_time,
        days_late: parseInt(row.days_late) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching payment streak:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
