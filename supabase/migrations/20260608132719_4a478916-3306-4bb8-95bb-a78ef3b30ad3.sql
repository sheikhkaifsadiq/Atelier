
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_issue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON public.profiles(stripe_customer_id);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (webhook) touches this table.
