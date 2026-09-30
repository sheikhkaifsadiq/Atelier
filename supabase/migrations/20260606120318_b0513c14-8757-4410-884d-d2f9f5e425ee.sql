
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;

-- Storage policies: users can upload/read their own files under {user_id}/...; anyone can read (public bucket)
CREATE POLICY "chat-media public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "chat-media users upload own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media users delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
