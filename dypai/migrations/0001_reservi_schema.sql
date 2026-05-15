-- Reservi: bookings template schema (services, resources, availability, bookings, customers).

CREATE TABLE public.settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'Reservi Studio',
  tagline text NOT NULL DEFAULT 'Book in seconds. Run on time.',
  contact_email text NOT NULL DEFAULT 'hello@example.com',
  contact_phone text,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  locale text NOT NULL DEFAULT 'es-ES',
  currency text NOT NULL DEFAULT 'EUR',
  booking_window_days integer NOT NULL DEFAULT 30 CHECK (booking_window_days > 0),
  min_lead_minutes integer NOT NULL DEFAULT 60 CHECK (min_lead_minutes >= 0),
  cancellation_lead_minutes integer NOT NULL DEFAULT 720 CHECK (cancellation_lead_minutes >= 0),
  slot_step_minutes integer NOT NULL DEFAULT 15 CHECK (slot_step_minutes IN (5, 10, 15, 20, 30, 60)),
  auto_confirm boolean NOT NULL DEFAULT true,
  brand_color text NOT NULL DEFAULT '#0ea5e9',
  hero_image_url text,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'staff' CHECK (kind IN ('staff', 'room', 'equipment')),
  description text,
  avatar_url text,
  color text NOT NULL DEFAULT '#0ea5e9',
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  timezone text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  color text NOT NULL DEFAULT '#0ea5e9',
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  requires_resource boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_resources (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, resource_id)
);

CREATE TABLE public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE,
  reason text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  is_recurring boolean NOT NULL DEFAULT false,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  user_id text,
  notes text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  bookings_count integer NOT NULL DEFAULT 0,
  last_booking_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.booking_code_seq START 10001;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE DEFAULT 'BK-' || lpad(nextval('public.booking_code_seq')::text, 6, '0'),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  resource_name text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  party_size integer NOT NULL DEFAULT 1 CHECK (party_size > 0),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  paid boolean NOT NULL DEFAULT false,
  notes text,
  internal_notes text,
  cancellation_reason text,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('public', 'admin', 'import')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  reminded_at timestamptz
);

CREATE TABLE public.booking_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_user_id text,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX services_active_idx ON public.services (is_active, sort_order, name);
CREATE INDEX services_public_idx ON public.services (is_public, is_active);
CREATE INDEX resources_active_idx ON public.resources (is_active, sort_order, name);
CREATE INDEX availability_rules_resource_idx ON public.availability_rules (resource_id, weekday);
CREATE INDEX time_blocks_resource_window_idx ON public.time_blocks (resource_id, starts_at, ends_at);
CREATE INDEX time_blocks_global_window_idx ON public.time_blocks (starts_at, ends_at) WHERE resource_id IS NULL;
CREATE INDEX bookings_resource_window_idx ON public.bookings (resource_id, starts_at, ends_at) WHERE status IN ('pending', 'confirmed');
CREATE INDEX bookings_status_starts_idx ON public.bookings (status, starts_at);
CREATE INDEX bookings_starts_idx ON public.bookings (starts_at);
CREATE INDEX bookings_customer_idx ON public.bookings (customer_id, starts_at DESC);
CREATE INDEX booking_status_events_booking_idx ON public.booking_status_events (booking_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_settings_updated_at         BEFORE UPDATE ON public.settings        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_resources_updated_at        BEFORE UPDATE ON public.resources       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_services_updated_at         BEFORE UPDATE ON public.services        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_customers_updated_at        BEFORE UPDATE ON public.customers       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_bookings_updated_at         BEFORE UPDATE ON public.bookings        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (id) VALUES (1);

INSERT INTO public.resources (slug, name, kind, color, sort_order, description) VALUES
  ('alex',   'Alex Romero',  'staff', '#22c55e', 1, 'Senior estilista — corte y barba'),
  ('marina', 'Marina Vega',  'staff', '#f97316', 2, 'Especialista en color y tratamientos'),
  ('sala-1', 'Sala 1',       'room',  '#6366f1', 3, 'Sala principal con dos puestos');

INSERT INTO public.services (slug, name, description, duration_minutes, buffer_minutes, price_cents, color, sort_order) VALUES
  ('corte-clasico',     'Corte clásico',     'Corte de pelo a tijera o máquina, lavado e hidratación.', 30, 5, 2200, '#0ea5e9', 1),
  ('corte-y-barba',     'Corte y barba',     'Corte completo más arreglo de barba con toalla caliente.', 45, 5, 3200, '#22c55e', 2),
  ('color-y-tratamiento','Color y tratamiento','Color completo con tratamiento de hidratación profunda.', 90, 10, 6500, '#f97316', 3),
  ('consultoria-30',    'Consultoría 30 min','Sesión rápida de diagnóstico (online o presencial).',     30, 0, 0,    '#6366f1', 4);

INSERT INTO public.service_resources (service_id, resource_id)
SELECT s.id, r.id
FROM public.services s
CROSS JOIN public.resources r
WHERE
  (s.slug IN ('corte-clasico', 'corte-y-barba') AND r.slug IN ('alex', 'sala-1')) OR
  (s.slug = 'color-y-tratamiento'               AND r.slug IN ('marina', 'sala-1')) OR
  (s.slug = 'consultoria-30'                    AND r.slug IN ('alex', 'marina'));

INSERT INTO public.availability_rules (resource_id, weekday, start_time, end_time)
SELECT r.id, d.weekday, '10:00'::time, '14:00'::time
FROM public.resources r
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(weekday)
WHERE r.kind = 'staff';

INSERT INTO public.availability_rules (resource_id, weekday, start_time, end_time)
SELECT r.id, d.weekday, '16:00'::time, '20:00'::time
FROM public.resources r
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(weekday)
WHERE r.kind = 'staff';

INSERT INTO public.availability_rules (resource_id, weekday, start_time, end_time)
SELECT r.id, d.weekday, '10:00'::time, '20:00'::time
FROM public.resources r
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(weekday)
WHERE r.kind = 'room';
