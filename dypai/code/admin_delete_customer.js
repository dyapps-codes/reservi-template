async function main(data, { db }) {
  const id = String(data.id || '').trim();
  if (!id) throw new Error('id is required');

  const refs = await db.query('SELECT count(*)::int AS n FROM public.bookings WHERE customer_id = $1::uuid', [id]);
  if ((refs[0] && refs[0].n) > 0) {
    return { ok: false, error: 'Customer has bookings — archive or anonymize instead of deleting.' };
  }

  const rows = await db.query('DELETE FROM public.customers WHERE id = $1::uuid RETURNING id', [id]);
  if (!rows[0]) throw new Error('Customer not found');
  return { ok: true, deleted: true };
}
