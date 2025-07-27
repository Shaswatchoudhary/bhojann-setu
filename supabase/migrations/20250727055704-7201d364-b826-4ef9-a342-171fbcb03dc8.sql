-- First, let's add contact_number and preferred_languages to profiles table if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS preferred_languages text[] DEFAULT ARRAY['English'];

-- Create feedbacks/reviews table for vendor-supplier feedback
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  message TEXT,
  rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on feedbacks
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedbacks
CREATE POLICY "Vendors can create feedbacks" ON public.feedbacks
  FOR INSERT WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view their own feedbacks" ON public.feedbacks
  FOR SELECT USING (auth.uid() = vendor_id);

CREATE POLICY "Suppliers can view feedbacks about them" ON public.feedbacks
  FOR SELECT USING (auth.uid() = supplier_id);

CREATE POLICY "Vendors can update their own feedbacks" ON public.feedbacks
  FOR UPDATE USING (auth.uid() = vendor_id);

-- Create trigger for updated_at
CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();