SELECT
  jsonb_build_object(
    'today_bookings',     COALESCE((SELECT COUNT(*) FROM public.bookings WHERE starts_at::date = (now() AT TIME ZONE (SELECT timezone FROM public.settings WHERE id = 1))::date AND status IN ('pending', 'confirmed', 'completed')), 0),
    'today_pending',      COALESCE((SELECT COUNT(*) FROM public.bookings WHERE starts_at::date = (now() AT TIME ZONE (SELECT timezone FROM public.settings WHERE id = 1))::date AND status = 'pending'), 0),
    'week_bookings',      COALESCE((SELECT COUNT(*) FROM public.bookings WHERE starts_at >= now() AND starts_at < now() + interval '7 days' AND status IN ('pending', 'confirmed')), 0),
    'week_revenue_cents', COALESCE((SELECT SUM(price_cents) FROM public.bookings WHERE starts_at >= now() AND starts_at < now() + interval '7 days' AND status IN ('confirmed', 'completed')), 0),
    'total_customers',    COALESCE((SELECT COUNT(*) FROM public.customers), 0),
    'active_services',    COALESCE((SELECT COUNT(*) FROM public.services WHERE is_active = true), 0),
    'active_resources',   COALESCE((SELECT COUNT(*) FROM public.resources WHERE is_active = true), 0)
  ) AS metrics,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'booking_code', b.booking_code,
        'service_name', b.service_name,
        'resource_name', b.resource_name,
        'starts_at', b.starts_at,
        'ends_at', b.ends_at,
        'status', b.status,
        'customer_name', c.full_name,
        'customer_email', c.email,
        'customer_phone', c.phone
      )
      ORDER BY b.starts_at ASC
    )
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.starts_at::date = (now() AT TIME ZONE (SELECT timezone FROM public.settings WHERE id = 1))::date
      AND b.status IN ('pending', 'confirmed', 'completed')
  ), '[]'::jsonb) AS today,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'booking_code', b.booking_code,
        'service_name', b.service_name,
        'resource_name', b.resource_name,
        'starts_at', b.starts_at,
        'status', b.status,
        'customer_name', c.full_name
      )
      ORDER BY b.starts_at ASC
    )
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.starts_at > now() AND b.starts_at < now() + interval '7 days'
      AND b.status IN ('pending', 'confirmed')
    LIMIT 12
  ), '[]'::jsonb) AS upcoming,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('day', d::date, 'count', COALESCE(c.cnt, 0))
      ORDER BY d
    )
    FROM generate_series((now() - interval '13 days')::date, now()::date, '1 day') AS d
    LEFT JOIN (
      SELECT starts_at::date AS day, COUNT(*) AS cnt
      FROM public.bookings
      WHERE starts_at >= now() - interval '14 days'
      GROUP BY starts_at::date
    ) c ON c.day = d::date
  ), '[]'::jsonb) AS chart_14d;
