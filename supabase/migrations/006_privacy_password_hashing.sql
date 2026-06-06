-- ──────────────────────────────────────────────────────────────
-- Migration 006 — Remove plaintext privacy_password from wedding configs
--
-- The privacy_password field was defined in the type system but never
-- implemented in production. This migration removes any plaintext values
-- from the config JSONB column so they cannot be exposed in future queries.
--
-- After applying this migration, passwords are stored as scrypt hashes
-- under the key privacy_password_hash and never returned to clients.
-- ──────────────────────────────────────────────────────────────

-- Remove the plaintext privacy_password key from all wedding configs that have it
UPDATE weddings
SET    config = config - 'privacy_password'
WHERE  config ? 'privacy_password';

-- Also clean up any accidental privacy_password_hash entries stored as plaintext
-- (i.e. strings that are not in the expected <hex>.<salt> format)
UPDATE weddings
SET    config = config - 'privacy_password_hash'
WHERE  config ? 'privacy_password_hash'
  AND  config->>'privacy_password_hash' NOT LIKE '%.%';
