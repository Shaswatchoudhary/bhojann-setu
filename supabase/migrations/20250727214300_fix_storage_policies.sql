-- 1. Remove existing restrictive policies
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1nq2cb_0" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1nq2cb_1" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1nq2cb_2" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1nq2cb_3" ON storage.objects;

-- 2. Create new policies for the image bucket
-- Allow public read access to all files in the image bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'image');

-- Allow authenticated users to upload files
CREATE POLICY "Allow uploads for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'image');

-- Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
