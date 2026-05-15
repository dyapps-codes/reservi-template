async function main(data, { db }) {
  const email = String(data.email || '').trim().toLowerCase();
  const fullName = String(data.full_name || '').trim();
  const phone = data.phone ? String(data.phone).trim() : null;
  const notes = data.notes ? String(data.notes).trim() : null;
  const marketing = Boolean(data.marketing_opt_in);

  if (!email || email.indexOf('@') < 0) throw new Error('Valid email is required');
  if (!fullName) throw new Error('Full name is required');

  if (data.id) {
    const rows = await db.query(
      'UPDATE public.customers SET email = $1, full_name = $2, phone = $3, notes = $4, marketing_opt_in = $5 ' +
      'WHERE id = $6::uuid RETURNING *',
      [email, fullName, phone, notes, marketing, String(data.id)],
    );
    if (!rows[0]) throw new Error('Customer not found');
    return { ok: true, customer: rows[0] };
  }

  const rows = await db.query(
    'INSERT INTO public.customers (email, full_name, phone, notes, marketing_opt_in) ' +
    'VALUES ($1, $2, $3, $4, $5) ' +
    'ON CONFLICT (email) DO UPDATE SET ' +
    '  full_name = EXCLUDED.full_name, ' +
    '  phone = COALESCE(EXCLUDED.phone, public.customers.phone), ' +
    '  notes = COALESCE(EXCLUDED.notes, public.customers.notes), ' +
    '  marketing_opt_in = EXCLUDED.marketing_opt_in ' +
    'RETURNING *',
    [email, fullName, phone, notes, marketing],
  );
  return { ok: true, customer: rows[0] };
}
