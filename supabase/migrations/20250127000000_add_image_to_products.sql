-- Add image_url column to products table
ALTER TABLE public.products 
ADD COLUMN image_url TEXT;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.products.image_url IS 'URL pointing to the product image stored in Supabase Storage';
