CREATE OR REPLACE FUNCTION public.create_booking(payload jsonb, p_user_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_row    public.settings%ROWTYPE;
  service_row     public.services%ROWTYPE;
  resource_row    public.resources%ROWTYPE;
  customer_row    public.customers%ROWTYPE;
  booking_row     public.bookings%ROWTYPE;
  v_email         text := lower(btrim(coalesce(payload->>'customer_email', '')));
  v_name          text := btrim(coalesce(payload->>'customer_name', ''));
  v_phone         text := nullif(btrim(coalesce(payload->>'customer_phone', '')), '');
  v_notes         text := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_party_size    integer := greatest(1, floor(coalesce((payload->>'party_size')::numeric, 1))::integer);
  v_source        text := lower(coalesce(payload->>'source', 'admin'));
  v_service_id    uuid := nullif(payload->>'service_id', '')::uuid;
  v_service_slug  text := nullif(payload->>'service_slug', '');
  v_resource_id   uuid := nullif(payload->>'resource_id', '')::uuid;
  v_starts_at     timestamptz;
  v_ends_at       timestamptz;
  v_local_dow     smallint;
  v_local_start   time;
  v_local_end     time;
  v_overlap_count integer;
  v_block_count   integer;
  v_window_count  integer;
  v_status        text;
BEGIN
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'A valid customer email is required';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF NOT (v_source IN ('public', 'admin', 'import')) THEN
    v_source := 'admin';
  END IF;

  SELECT * INTO settings_row FROM public.settings WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store settings missing';
  END IF;

  IF v_service_id IS NOT NULL THEN
    SELECT * INTO service_row FROM public.services WHERE id = v_service_id AND is_active = true;
  ELSIF v_service_slug IS NOT NULL THEN
    SELECT * INTO service_row FROM public.services WHERE slug = v_service_slug AND is_active = true;
  ELSE
    RAISE EXCEPTION 'service_id or service_slug is required';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found or inactive';
  END IF;

  v_starts_at := (payload->>'starts_at')::timestamptz;
  IF v_starts_at IS NULL THEN
    RAISE EXCEPTION 'starts_at is required';
  END IF;

  v_ends_at := v_starts_at + make_interval(mins => service_row.duration_minutes);

  IF v_starts_at < now() + make_interval(mins => settings_row.min_lead_minutes) THEN
    RAISE EXCEPTION 'Booking must be at least % minutes in the future', settings_row.min_lead_minutes;
  END IF;
  IF v_starts_at > now() + make_interval(days => settings_row.booking_window_days) THEN
    RAISE EXCEPTION 'Booking is beyond the % day booking window', settings_row.booking_window_days;
  END IF;

  IF service_row.requires_resource THEN
    IF v_resource_id IS NULL THEN
      SELECT sr.resource_id INTO v_resource_id
      FROM public.service_resources sr
      JOIN public.resources r ON r.id = sr.resource_id AND r.is_active = true
      LEFT JOIN public.bookings b
        ON b.resource_id = sr.resource_id
       AND b.status IN ('pending', 'confirmed')
       AND b.starts_at < v_ends_at
       AND b.ends_at > v_starts_at
      WHERE sr.service_id = service_row.id AND b.id IS NULL
      LIMIT 1;

      IF v_resource_id IS NULL THEN
        RAISE EXCEPTION 'No resource available for the selected time';
      END IF;
    ELSE
      PERFORM 1
      FROM public.service_resources sr
      WHERE sr.service_id = service_row.id AND sr.resource_id = v_resource_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected resource is not assigned to this service';
      END IF;
    END IF;

    SELECT * INTO resource_row FROM public.resources WHERE id = v_resource_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Resource not available';
    END IF;

    v_local_dow := EXTRACT(ISODOW FROM (v_starts_at AT TIME ZONE coalesce(resource_row.timezone, settings_row.timezone)))::smallint % 7;
    v_local_start := (v_starts_at AT TIME ZONE coalesce(resource_row.timezone, settings_row.timezone))::time;
    v_local_end   := (v_ends_at   AT TIME ZONE coalesce(resource_row.timezone, settings_row.timezone))::time;

    SELECT count(*) INTO v_window_count
    FROM public.availability_rules ar
    WHERE ar.resource_id = resource_row.id
      AND ar.weekday = v_local_dow
      AND ar.is_active = true
      AND ar.start_time <= v_local_start
      AND ar.end_time   >= v_local_end;

    IF v_window_count = 0 THEN
      RAISE EXCEPTION 'Resource is not available at the requested time';
    END IF;

    SELECT count(*) INTO v_overlap_count
    FROM public.bookings b
    WHERE b.resource_id = resource_row.id
      AND b.status IN ('pending', 'confirmed')
      AND b.starts_at < v_ends_at
      AND b.ends_at > v_starts_at;

    IF v_overlap_count >= resource_row.capacity THEN
      RAISE EXCEPTION 'Selected slot is no longer available';
    END IF;

    SELECT count(*) INTO v_block_count
    FROM public.time_blocks tb
    WHERE (tb.resource_id = resource_row.id OR tb.resource_id IS NULL)
      AND tb.starts_at < v_ends_at
      AND tb.ends_at   > v_starts_at;

    IF v_block_count > 0 THEN
      RAISE EXCEPTION 'Selected slot is blocked';
    END IF;
  ELSE
    SELECT count(*) INTO v_block_count
    FROM public.time_blocks tb
    WHERE tb.resource_id IS NULL
      AND tb.starts_at < v_ends_at
      AND tb.ends_at   > v_starts_at;

    IF v_block_count > 0 THEN
      RAISE EXCEPTION 'Selected slot is blocked';
    END IF;
  END IF;

  INSERT INTO public.customers (email, full_name, phone, user_id)
  VALUES (v_email, v_name, v_phone, p_user_id)
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.customers.full_name),
    phone     = COALESCE(EXCLUDED.phone, public.customers.phone),
    user_id   = COALESCE(public.customers.user_id, EXCLUDED.user_id),
    updated_at = now()
  RETURNING * INTO customer_row;

  v_status := CASE WHEN settings_row.auto_confirm THEN 'confirmed' ELSE 'pending' END;

  INSERT INTO public.bookings (
    customer_id, service_id, resource_id, service_name, resource_name,
    starts_at, ends_at, duration_minutes, party_size, status,
    price_cents, currency, notes, source, created_by_user_id, confirmed_at
  ) VALUES (
    customer_row.id, service_row.id, v_resource_id, service_row.name, resource_row.name,
    v_starts_at, v_ends_at, service_row.duration_minutes, v_party_size, v_status,
    service_row.price_cents, service_row.currency, v_notes, v_source, p_user_id,
    CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END
  )
  RETURNING * INTO booking_row;

  UPDATE public.customers
  SET bookings_count = bookings_count + 1,
      last_booking_at = booking_row.starts_at
  WHERE id = customer_row.id;

  INSERT INTO public.booking_status_events (booking_id, actor_user_id, event_type, message, metadata)
  VALUES (
    booking_row.id, p_user_id, 'booking_created',
    'Booking created (' || v_status || ')',
    jsonb_build_object('source', v_source)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'booking', to_jsonb(booking_row),
    'customer', to_jsonb(customer_row),
    'service',  to_jsonb(service_row),
    'resource', to_jsonb(resource_row)
  );
END;
$$;
