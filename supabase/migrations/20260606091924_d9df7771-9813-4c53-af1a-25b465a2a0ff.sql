ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS turn_id uuid,
  ADD COLUMN IF NOT EXISTS variant_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS messages_session_turn_idx
  ON public.messages (session_id, turn_id, variant_index);