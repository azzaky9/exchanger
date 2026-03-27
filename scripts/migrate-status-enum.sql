-- Step 1: Cast status column to plain text (removes enum constraint temporarily)
ALTER TABLE transactions ALTER COLUMN status TYPE text;

-- Step 2: Remap any old legacy status values to new ones
UPDATE transactions SET status = 'pending'      WHERE status = 'awaiting_fiat';
UPDATE transactions SET status = 'pending'      WHERE status = 'awaiting_crypto';
UPDATE transactions SET status = 'pending'      WHERE status = 'awaiting_payment';
UPDATE transactions SET status = 'processing'   WHERE status = 'fiat_received';
UPDATE transactions SET status = 'processing'   WHERE status = 'crypto_received';
UPDATE transactions SET status = 'completed'    WHERE status = 'fiat_sent';
UPDATE transactions SET status = 'completed'    WHERE status = 'crypto_sent';
UPDATE transactions SET status = 'review_needed' WHERE status = 'failed';
UPDATE transactions SET status = 'review_needed' WHERE status = 'dispute';
-- Set any unrecognised values to 'pending' as a safe default
UPDATE transactions
SET status = 'pending'
WHERE status NOT IN ('pending','confirmed','processing','completed','refunded','review_needed');

-- Step 3: Drop the old enum type (Payload will recreate it with the correct values on next boot)
DROP TYPE IF EXISTS "public"."enum_transactions_status";
