const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/goals — create new goal
router.post('/', authenticateToken, async (req, res) => {
  const { name, emoji, target_amount, target_date, group_id } = req.body;
  const userId = req.user.id;
  
  try {
    // Validate required fields
    if (!name || !target_amount || !target_date) {
      return res.status(400).json({ error: 'Name, target amount, and target date are required' });
    }
    
    // Validate group ownership if group_id is provided
    if (group_id) {
      const groupCheck = await db.query(
        'SELECT admin_id FROM groups WHERE id = $1',
        [group_id]
      );
      
      if (groupCheck.rows.length === 0 || groupCheck.rows[0].admin_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Create goal
    const result = await db.query(`
      INSERT INTO goals (user_id, group_id, name, emoji, target_amount, target_date, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id, user_id, group_id, name, emoji, target_amount, current_amount, target_date, status, created_at, updated_at
    `, [userId, group_id || null, name, emoji || '🎯', target_amount, target_date]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/goals — get user's goals
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { group_id, status } = req.query;
  
  try {
    let query = `
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
        gr.name as group_name,
        gr.emoji as group_emoji
      FROM goals g
      LEFT JOIN groups gr ON g.group_id = gr.id
      WHERE g.user_id = $1
    `;
    
    const params = [userId];
    
    if (group_id) {
      query += ' AND g.group_id = $2';
      params.push(group_id);
    }
    
    if (status) {
      query += ' AND g.status = $3';
      params.push(status);
    }
    
    query += ' ORDER BY g.created_at DESC';
    
    const result = await db.query(query, params);
    
    // Calculate progress percentage for each goal
    const goalsWithProgress = result.rows.map(goal => ({
      ...goal,
      progress_percentage: goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
    }));
    
    res.json(goalsWithProgress);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/goals/:id — update goal
router.put('/:id', authenticateToken, async (req, res) => {
  const { id: goalId } = req.params;
  const { name, emoji, target_amount, target_date, status } = req.body;
  const userId = req.user.id;
  
  try {
    // Check if goal exists and belongs to user
    const goalCheck = await db.query(
      'SELECT user_id FROM goals WHERE id = $1',
      [goalId]
    );
    
    if (goalCheck.rows.length === 0 || goalCheck.rows[0].user_id !== userId) {
      return res.status(404).json({ error: 'Goal not found or access denied' });
    }
    
    // Update goal
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = $1');
      updateValues.push(name);
    }
    
    if (emoji !== undefined) {
      updateFields.push('emoji = $1');
      updateValues.push(emoji);
    }
    
    if (target_amount !== undefined) {
      updateFields.push('target_amount = $1');
      updateValues.push(target_amount);
    }
    
    if (target_date !== undefined) {
      updateFields.push('target_date = $1');
      updateValues.push(target_date);
    }
    
    if (status !== undefined) {
      updateFields.push('status = $1');
      updateValues.push(status);
    }
    
    updateFields.push('updated_at = NOW()');
    
    const updateQuery = `
      UPDATE goals 
      SET ${updateFields.join(', ')}
      WHERE id = $${goalId}
      RETURNING id, user_id, group_id, name, emoji, target_amount, current_amount, target_date, status, created_at, updated_at
    `;
    
    const result = await db.query(updateQuery, updateValues);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/goals/:id — delete goal
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id: goalId } = req.params;
  const userId = req.user.id;
  
  try {
    // Check if goal exists and belongs to user
    const goalCheck = await db.query(
      'SELECT user_id FROM goals WHERE id = $1',
      [goalId]
    );
    
    if (goalCheck.rows.length === 0 || goalCheck.rows[0].user_id !== userId) {
      return res.status(404).json({ error: 'Goal not found or access denied' });
    }
    
    // Delete goal
    await db.query('DELETE FROM goals WHERE id = $1', [goalId]);
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/goals/:id/progress — update goal progress
router.post('/:id/progress', authenticateToken, async (req, res) => {
  const { id: goalId } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;
  
  try {
    // Check if goal exists and belongs to user
    const goalCheck = await db.query(
      'SELECT user_id, target_amount FROM goals WHERE id = $1',
      [goalId]
    );
    
    if (goalCheck.rows.length === 0 || goalCheck.rows[0].user_id !== userId) {
      return res.status(404).json({ error: 'Goal not found or access denied' });
    }
    
    const goal = goalCheck.rows[0];
    
    // Validate amount doesn't exceed target
    if (amount && goal.target_amount && (parseInt(goal.current_amount) + parseInt(amount)) > parseInt(goal.target_amount)) {
      return res.status(400).json({ error: 'Amount exceeds target amount' });
    }
    
    // Update goal progress
    const newCurrentAmount = amount ? parseInt(goal.current_amount) + parseInt(amount) : goal.current_amount;
    
    await db.query(`
      UPDATE goals 
      SET current_amount = $1, updated_at = NOW()
      WHERE id = $2
    `, [newCurrentAmount, goalId]);
    
    // Check if goal is completed
    if (newCurrentAmount >= goal.target_amount) {
      await db.query(
        'UPDATE goals SET status = $1 WHERE id = $2',
        ['completed', goalId]
      );
    }
    
    res.json({
      message: 'Goal progress updated successfully',
      current_amount: newCurrentAmount,
      is_completed: newCurrentAmount >= goal.target_amount
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/goals/:id — get single goal
router.get('/:id', authenticateToken, async (req, res) => {
  const { id: goalId } = req.params;
  const userId = req.user.id;
  
  try {
    const result = await db.query(`
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
        gr.name as group_name,
        gr.emoji as group_emoji
      FROM goals g
      LEFT JOIN groups gr ON g.group_id = gr.id
      WHERE g.id = $1 AND g.user_id = $2
    `, [goalId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const goal = result.rows[0];
    const progressPercentage = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
    
    res.json({
      ...goal,
      progress_percentage: progressPercentage
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
