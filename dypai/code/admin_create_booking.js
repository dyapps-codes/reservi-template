async function main(data, { db, user }) {
  const userId = (user && user.id) || null;

  const payload = {
    service_id: data.service_id || null,
    resource_id: data.resource_id || null,
    starts_at: data.starts_at || null,
    customer_name: data.customer_name || '',
    customer_email: data.customer_email || '',
    customer_phone: data.customer_phone || null,
    party_size: data.party_size || 1,
    notes: data.notes || null,
    source: 'admin',
  };

  const rows = await db.query(
    'SELECT public.create_booking($1::jsonb, $2::text) AS result',
    [JSON.stringify(payload), userId],
  );

  return rows[0].result;
}
