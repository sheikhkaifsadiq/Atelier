-- Backfill turn_id on bot messages that share a (session_id, created_at) with a
-- user message that already has turn_id. This fixes orphaned variant-0 bot
-- replies created before the editLastUserMessage timestamp-comparison fix.
UPDATE public.messages b
SET turn_id = u.turn_id, variant_index = u.variant_index
FROM public.messages u
WHERE b.sender = 'bot'
  AND b.turn_id IS NULL
  AND u.sender = 'user'
  AND u.turn_id IS NOT NULL
  AND u.session_id = b.session_id
  AND u.created_at = b.created_at
  AND u.user_id = b.user_id;