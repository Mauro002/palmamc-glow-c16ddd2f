ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_error TEXT;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'completed', 'delivered', 'delivery_failed', 'failed', 'refunded'));
