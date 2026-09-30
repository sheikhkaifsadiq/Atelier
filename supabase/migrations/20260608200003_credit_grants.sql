
-- ============ CREDIT GRANT AUDIT LOG ============
CREATE TABLE public.credit_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        NUMERIC(10,3) NOT NULL,
  reason        TEXT NOT NULL,   -- 'subscription_create' | 'subscription_cycle' | 'manual'
  stripe_invoice_id TEXT,
  stripe_event_id   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_grants TO authenticated;
GRANT ALL ON public.credit_grants TO service_role;
ALTER TABLE public.credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own credit grants" ON public.credit_grants
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_credit_grants_user ON public.credit_grants(user_id, created_at DESC);

-- ============ STRIPE INVOICES CACHE ============
CREATE TABLE public.stripe_invoices (
  id              TEXT PRIMARY KEY,            -- Stripe invoice ID
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_paid     INTEGER,                     -- cents
  currency        TEXT,
  status          TEXT,
  billing_reason  TEXT,
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  invoice_pdf     TEXT,
  hosted_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stripe_invoices TO authenticated;
GRANT ALL ON public.stripe_invoices TO service_role;
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own invoices" ON public.stripe_invoices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_stripe_invoices_user ON public.stripe_invoices(user_id, created_at DESC);
