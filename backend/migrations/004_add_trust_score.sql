-- Add member trust score field to users table
ALTER TABLE users ADD COLUMN trust_score INTEGER DEFAULT 100;
