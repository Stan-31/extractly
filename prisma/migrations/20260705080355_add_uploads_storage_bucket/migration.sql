-- Private bucket for uploaded invoice files (PDFs/images), scoped per user.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Objects are stored under `${userId}/...` — restrict each user to their own folder.
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
