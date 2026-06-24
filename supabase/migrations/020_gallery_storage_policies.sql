-- Migration 020: Storage RLS policies for wedding-gallery bucket
-- Allows authenticated wedding owners to upload/delete their own photos.
-- Public reads are handled by the bucket being public (no policy needed for SELECT).

-- Upload: authenticated user must own the wedding whose ID is the first path segment
CREATE POLICY "Owners can upload gallery photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wedding-gallery'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
  );

-- Delete: same ownership check
CREATE POLICY "Owners can delete gallery photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wedding-gallery'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
  );
