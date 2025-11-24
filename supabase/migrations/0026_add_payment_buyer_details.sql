-- 0026_add_payment_buyer_details.sql
-- Add buyer details columns to payments table

-- Add missing columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS payment_link_id TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_email ON public.payments(email);
CREATE INDEX IF NOT EXISTS idx_payments_payment_link_id ON public.payments(payment_link_id);

-- Add comment
COMMENT ON COLUMN public.payments.buyer_name IS 'Name of the person making the payment';
COMMENT ON COLUMN public.payments.email IS 'Email of the person making the payment';
COMMENT ON COLUMN public.payments.phone IS 'Phone number of the person making the payment';
COMMENT ON COLUMN public.payments.purpose IS 'Purpose/description of the payment';
COMMENT ON COLUMN public.payments.payment_link_id IS 'Payment gateway link identifier';
