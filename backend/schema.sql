-- Run this in your PostgreSQL database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) UNIQUE NOT NULL,
  email         VARCHAR(100),
  password_hash TEXT NOT NULL,
  avatar_color  VARCHAR(20) DEFAULT '#2D9B4E',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE groups (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(100) NOT NULL,
  description         TEXT,
  emoji               VARCHAR(10) DEFAULT '🌱',
  contribution_amount INTEGER NOT NULL,       -- in Rwf
  cycle_duration      VARCHAR(20) DEFAULT 'monthly', -- monthly | bi-weekly | weekly
  total_cycles        INTEGER NOT NULL,
  current_cycle       INTEGER DEFAULT 1,
  status              VARCHAR(20) DEFAULT 'active',  -- active | completed | paused
  admin_id            UUID REFERENCES users(id),
  invite_code         VARCHAR(20) UNIQUE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  position   INTEGER NOT NULL,              -- payout order position
  status     VARCHAR(20) DEFAULT 'active',  -- active | removed
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE cycles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID REFERENCES groups(id) ON DELETE CASCADE,
  cycle_number   INTEGER NOT NULL,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  payout_user_id UUID REFERENCES users(id),
  status         VARCHAR(20) DEFAULT 'active', -- active | completed
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contributions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id   UUID REFERENCES cycles(id),
  group_id   UUID REFERENCES groups(id),
  user_id    UUID REFERENCES users(id),
  amount     INTEGER NOT NULL,
  method     VARCHAR(30),                   -- MTN MoMo | Airtel Money
  status     VARCHAR(20) DEFAULT 'pending', -- pending | paid | failed
  paid_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_members_user    ON members(user_id);
CREATE INDEX idx_members_group   ON members(group_id);
CREATE INDEX idx_cycles_group    ON cycles(group_id);
CREATE INDEX idx_contributions_cycle ON contributions(cycle_id);
CREATE INDEX idx_contributions_user  ON contributions(user_id);
