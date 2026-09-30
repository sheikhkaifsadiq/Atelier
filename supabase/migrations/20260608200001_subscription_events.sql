
-- ============ SUBSCRIPTION TIMELINE ============
CREATE TABLE public.subscription_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,   -- 'created' | 'renewed' | 'paused' | 'resumed' | 'canceled' | 'payment_failed' | 'payment_recovered'
  status      TEXT,
  period_end  TIMESTAMPTZ,
  stripe_event_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription events" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_sub_events_user_created ON public.subscription_events(user_id, created_at DESC);
