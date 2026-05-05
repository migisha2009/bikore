-- Add personal savings goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT '🎯',
  target_amount INTEGER NOT NULL,
  current_amount INTEGER DEFAULT 0,
  target_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active, completed, paused
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_group ON goals(group_id);
CREATE INDEX idx_goals_status ON goals(status);
