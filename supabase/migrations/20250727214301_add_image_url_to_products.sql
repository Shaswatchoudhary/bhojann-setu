-- Add image_url column to products table if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.products.image_url IS 'URL pointing to the product image stored in Supabase Storage';

-- Update RLS policies to include the new column
ALTER POLICY "Suppliers can manage their own products" 
ON public.products 
USING (auth.uid() = (
  SELECT user_id FROM public.profiles WHERE id = supplier_id
)) 
WITH CHECK (auth.uid() = (
  SELECT user_id FROM public.profiles WHERE id = supplier_id
));
