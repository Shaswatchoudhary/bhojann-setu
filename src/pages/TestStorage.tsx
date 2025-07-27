import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export default function TestStorage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPublicUrl(null);
      setStatus('');
    }
  };

  const checkBucketConfig = async () => {
    try {
      // 1. Check bucket existence and get its configuration
      const { data: bucket, error: bucketError } = await supabase.storage
        .getBucket('image');
      
      if (bucketError) throw bucketError;
      
      console.log('Bucket configuration:', {
        name: bucket.name,
        public: bucket.public,
        fileSizeLimit: bucket.file_size_limit,
        allowedMimeTypes: bucket.allowed_mime_types,
        createdAt: bucket.created_at
      });
      
      // 2. Check if we can list files (tests read permissions)
      const { data: files, error: listError } = await supabase.storage
        .from('image')
        .list();
      
      if (listError) {
        console.error('Error listing files:', listError);
      } else {
        console.log('Files in bucket:', files);
      }
      
      return true;
    } catch (error) {
      console.error('Error checking bucket config:', error);
      return false;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('Checking storage configuration...');

    try {
      // First check bucket configuration
      const isBucketConfigured = await checkBucketConfig();
      if (!isBucketConfigured) {
        throw new Error('Could not verify bucket configuration. Please check your Supabase storage settings.');
      }

      setUploading(true);
      setStatus('Uploading file...');

      try {
        // 1. First, verify we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('Not authenticated. Please sign in again.');
        }

        console.log('User session:', session.user.id);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/test-${Date.now()}.${fileExt}`;
        
        console.log('Attempting to upload to:', fileName);
        
        // 2. List buckets to verify access
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          console.error('Bucket error:', bucketError);
          throw new Error(`Cannot access storage: ${bucketError.message}`);
        }
        
        console.log('Available buckets:', buckets);
        
        // 3. Upload the file
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('image')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Upload error details:', {
            message: uploadError.message,
            status: uploadError.statusCode,
            details: uploadError
          });
          
          if (uploadError.message.includes('bucket')) {
            throw new Error('The "image" bucket might not exist or you might not have permission to access it.');
          }
          throw uploadError;
        }

        console.log('Upload successful:', uploadData);

        // 4. Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('image')
          .getPublicUrl(uploadData.path);

        console.log('Public URL:', publicUrl);
        
        // 5. Verify the file exists
        const { data: fileList } = await supabase.storage
          .from('image')
          .list(session.user.id);
          
        console.log('User files:', fileList);

        setPublicUrl(publicUrl);
        setStatus('✅ File uploaded successfully!');
        
      } catch (error) {
        console.error('Upload error:', error);
        setStatus(`❌ Error: ${error.message || 'Failed to upload file'}`);
        
        // Additional debug info
        if (error.details) {
          console.error('Error details:', error.details);
        }
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Error checking bucket config:', error);
      setStatus(`❌ Error: ${error.message || 'Failed to upload file'}`);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Storage Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select an image to upload</Label>
            <Input 
              id="file" 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={uploading}
            />
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Test File'}
          </Button>
          
          {status && (
            <div className={`p-3 rounded-md ${
              status.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {status}
            </div>
          )}
          
          {publicUrl && (
            <div className="mt-4 space-y-2">
              <Label>Uploaded Image:</Label>
              <img 
                src={publicUrl} 
                alt="Uploaded preview" 
                className="w-full h-auto rounded-md border"
              />
              <div className="text-sm text-muted-foreground break-all">
                URL: {publicUrl}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
