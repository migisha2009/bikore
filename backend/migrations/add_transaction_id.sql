-- Add transaction_id column to contributions table
ALTER TABLE contributions ADD COLUMN transaction_id VARCHAR(50);

-- Create index for transaction_id lookups
CREATE INDEX idx_contributions_transaction_id ON contributions(transaction_id);
