-- ──────────────────────────────────────────────────────────────
-- Migration 008 — Subscription / tier system
--
-- Creates the infrastructure for the 3-tier billing model:
--   starter  | ₦25,000 | 1 wedding | 150 guests
--   premium  | ₦65,000 | 2 weddings | 400 guests
--   luxury   | ₦150,000 | 5 weddings | unlimited
--
-- All existing users and new signups receive a complimentary_luxury
-- record with no expiry. When ready to charge, set
-- complimentary_expires_at to a future date and send a transition
-- email. No schema change is required at monetisation time.
-- ──────────────────────────────────────────────────────────────

CREATE TYPE subscription_tier   AS ENUM ('starter', 'premium', 'luxury');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tier                      subscription_tier   NOT NULL DEFAULT 'luxury',
  status                    subscription_status NOT NULL DEFAULT 'active',

  -- Complimentary flag — when true the subscription is free regardless of status/expiry
  is_complimentary          BOOLEAN     NOT NULL DEFAULT true,
  complimentary_expires_at  TIMESTAMPTZ,                 -- NULL = never expires

  -- Paystack references (populated once billing is live)
  paystack_customer_id      TEXT,
  paystack_subscription_code TEXT,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active subscription per user
CREATE UNIQUE INDEX subscriptions_user_id_unique ON subscriptions (user_id);

-- RLS — users can read their own subscription; service_role manages all
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Tier limits table ─────────────────────────────────────────
-- Read-only reference data. Checked server-side before creating
-- weddings or importing guests.
CREATE TABLE IF NOT EXISTS tier_limits (
  tier              subscription_tier PRIMARY KEY,
  max_weddings      INT  NOT NULL,
  max_guests        INT  NOT NULL,  -- -1 = unlimited
  label             TEXT NOT NULL,
  monthly_price_ngn INT  NOT NULL   -- 0 = free/complimentary
);

INSERT INTO tier_limits (tier, max_weddings, max_guests, label, monthly_price_ngn) VALUES
  ('starter', 1, 150,   'Starter',  25000),
  ('premium', 2, 400,   'Premium',  65000),
  ('luxury',  5, -1,    'Luxury',  150000)
ON CONFLICT (tier) DO UPDATE SET
  max_weddings      = EXCLUDED.max_weddings,
  max_guests        = EXCLUDED.max_guests,
  label             = EXCLUDED.label,
  monthly_price_ngn = EXCLUDED.monthly_price_ngn;

GRANT SELECT ON tier_limits TO anon, authenticated;

-- ── Backfill: give every existing user a complimentary luxury sub ─
INSERT INTO subscriptions (user_id, tier, status, is_complimentary)
SELECT id, 'luxury', 'active', true
FROM   auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ── Trigger: auto-create complimentary sub for new signups ────
CREATE OR REPLACE FUNCTION create_complimentary_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, tier, status, is_complimentary)
  VALUES (NEW.id, 'luxury', 'active', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_complimentary_subscription();

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();
