-- Public-facing cancel link via random token (avoids exposing booking_id)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

UPDATE public.bookings SET cancel_token = replace(gen_random_uuid()::text, '-', '') WHERE cancel_token IS NULL;

ALTER TABLE public.bookings ALTER COLUMN cancel_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_cancel_token_idx ON public.bookings (cancel_token);

-- For customer-detail view performance
CREATE INDEX IF NOT EXISTS bookings_customer_starts_idx ON public.bookings (customer_id, starts_at DESC);

-- Notification log so we don't double-send and have an audit trail
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  template text NOT NULL,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_booking_idx ON public.notifications (booking_id, created_at DESC);
