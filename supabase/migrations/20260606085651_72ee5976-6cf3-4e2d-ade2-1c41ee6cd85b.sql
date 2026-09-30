
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
