-- Migration: Add group enhancements and payment system
-- Run this after the initial schema.sql

-- Add new columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 20;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS late_penalty INTEGER DEFAULT 0;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS payout_method VARCHAR(20) DEFAULT 'order';

-- Member requests table (pending approvals)
CREATE TABLE IF NOT EXISTS member_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  UNIQUE(group_id, user_id)
);

-- Group rules agreement
CREATE TABLE IF NOT EXISTS member_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  agreed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group chat messages
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id UUID REFERENCES contributions(id),
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  method VARCHAR(30) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  provider_ref VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_member_requests_group ON member_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_member_requests_status ON member_requests(status);

-- Update existing groups to set max_members equal to total_cycles if not already set
UPDATE groups SET max_members = total_cycles WHERE max_members = 20 AND total_cycles != 20;

-- Set invite_expires_at for existing groups (48 hours from now)
UPDATE groups SET invite_expires_at = NOW() + INTERVAL '48 hours' WHERE invite_expires_at IS NULL;
