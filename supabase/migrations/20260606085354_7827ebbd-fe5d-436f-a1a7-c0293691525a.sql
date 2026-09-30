CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id text,
  pipeline_id uuid,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.message_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);