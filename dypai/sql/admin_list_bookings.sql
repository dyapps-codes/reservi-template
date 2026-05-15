WITH params AS (
  SELECT
    NULLIF(${input.status}, '')      AS status_in,
    NULLIF(${input.from}, '')        AS from_in,
    NULLIF(${input.to}, '')          AS to_in,
    NULLIF(${input.resource_id}, '') AS resource_in,
    NULLIF(${input.search}, '')      AS search_in,
    LEAST(GREATEST(COALESCE(${input.limit}, 50), 1), 200)  AS lim,
    GREATEST(COALESCE(${input.offset}, 0), 0)              AS off
),
filtered AS (
  SELECT
    b.id, b.booking_code, b.service_name, b.resource_name, b.starts_at, b.ends_at,
    b.status, b.price_cents, b.currency, b.party_size, b.notes, b.created_at,
    b.cancellation_reason, b.source,
    jsonb_build_object('id', c.id, 'full_name', c.full_name, 'email', c.email, 'phone', c.phone) AS customer
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id
  CROSS JOIN params p
  WHERE (p.status_in   IS NULL OR b.status = p.status_in)
    AND (p.from_in     IS NULL OR b.starts_at >= p.from_in::timestamptz)
    AND (p.to_in       IS NULL OR b.starts_at < p.to_in::timestamptz)
    AND (p.resource_in IS NULL OR b.resource_id = p.resource_in::uuid)
    AND (
      p.search_in IS NULL
      OR c.full_name    ILIKE '%' || p.search_in || '%'
      OR c.email        ILIKE '%' || p.search_in || '%'
      OR b.booking_code ILIKE '%' || p.search_in || '%'
    )
)
SELECT
  COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY starts_at DESC) FROM (
    SELECT * FROM filtered ORDER BY starts_at DESC
    LIMIT (SELECT lim FROM params)
    OFFSET (SELECT off FROM params)
  ) f), '[]'::jsonb) AS bookings,
  (SELECT COUNT(*) FROM filtered) AS total;
