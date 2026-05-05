-- Add late payment penalty functionality to groups table
ALTER TABLE groups ADD COLUMN late_penalty INTEGER DEFAULT 0;
