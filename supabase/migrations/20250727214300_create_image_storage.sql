-- Create the image storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('image', 'image', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) policies for the image bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'image');

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow uploads for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'image');

-- Policy to allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Function to check if a user can manage a file
CREATE OR REPLACE FUNCTION storage.can_manage_file(file_name text, user_id text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (storage.foldername(file_name))[1] = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
