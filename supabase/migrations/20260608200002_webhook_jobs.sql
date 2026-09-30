
-- ============ WEBHOOK JOB QUEUE ============
CREATE TABLE public.webhook_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ
);

GRANT ALL ON public.webhook_jobs TO service_role;
ALTER TABLE public.webhook_jobs ENABLE ROW LEVEL SECURITY;
-- No user-facing policies; only service_role processes jobs.

CREATE INDEX idx_webhook_jobs_status ON public.webhook_jobs(status, created_at ASC);
CREATE INDEX idx_webhook_jobs_stripe_event ON public.webhook_jobs(stripe_event_id);
