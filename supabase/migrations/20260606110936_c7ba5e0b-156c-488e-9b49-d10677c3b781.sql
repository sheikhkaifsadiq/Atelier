
-- 1) Prevent privilege escalation: block role changes on profile self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- 2) Explicit RLS policies for share-by-token access (anon + authenticated)
CREATE POLICY "Public can read shared sessions by token"
ON public.chat_sessions
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

CREATE POLICY "Public can read messages of shared sessions"
ON public.messages
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = messages.session_id
      AND s.share_token IS NOT NULL
  )
);

GRANT SELECT ON public.chat_sessions TO anon;
GRANT SELECT ON public.messages TO anon;
