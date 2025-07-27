import { supabase } from "@/integrations/supabase/client";

export async function verifyStorageSetup() {
  console.log('🔍 Verifying Supabase Storage setup...');
  
  // 1. Check if we can access storage
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error accessing Supabase Storage:', error.message);
      return { success: false, error: `Storage access error: ${error.message}` };
    }
    
    console.log('✅ Successfully connected to Supabase Storage');
    
    // 2. Check if our 'image' bucket exists
    const imageBucket = buckets.find(bucket => bucket.name === 'image');
    
    if (!imageBucket) {
      console.log('⚠️ "image" bucket not found. Attempting to create it...');
      
      try {
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('image', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880, // 5MB
        });
        
        if (createError) throw createError;
        
        console.log('✅ Successfully created "image" bucket');
      } catch (error) {
        console.error('❌ Failed to create "image" bucket:', error);
        return { success: false, error: `Failed to create bucket: ${error.message}` };
      }
    } else {
      console.log('✅ Found "image" bucket');
    }
    
    // 3. Test file upload with a small test file
    console.log('🧪 Testing file upload...');
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('image')
        .upload(`test-${Date.now()}.txt`, testFile);
        
      if (uploadError) throw uploadError;
      
      console.log('✅ Test file uploaded successfully');
      
      // 4. Clean up test file
      if (uploadData?.path) {
        await supabase.storage
          .from('image')
          .remove([uploadData.path]);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Test upload failed:', error);
      return { 
        success: false, 
        error: `Upload test failed: ${error.message}`,
        details: error
      };
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during storage verification:', error);
    return { 
      success: false, 
      error: `Unexpected error: ${error.message}`,
      details: error
    };
  }
}

// Run the verification if this file is run directly
if (import.meta.main) {
  verifyStorage().then(({ success, error }) => {
    if (success) {
      console.log('🎉 Storage verification completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Storage verification failed:', error);
      process.exit(1);
    }
  });
}
