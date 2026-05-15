const FIELDS = [
  ['business_name', 'text'],
  ['tagline', 'text'],
  ['contact_email', 'text'],
  ['contact_phone', 'text'],
  ['timezone', 'text'],
  ['locale', 'text'],
  ['currency', 'text'],
  ['booking_window_days', 'int'],
  ['min_lead_minutes', 'int'],
  ['cancellation_lead_minutes', 'int'],
  ['slot_step_minutes', 'int'],
  ['auto_confirm', 'bool'],
  ['brand_color', 'text'],
  ['hero_image_url', 'text'],
  ['notifications_enabled', 'bool'],
];

async function main(data, { db }) {
  const sets = [];
  const values = [];
  let idx = 1;

  for (const [key, kind] of FIELDS) {
    if (data[key] === undefined) continue;
    let value = data[key];
    if (kind === 'int') value = Math.max(0, Math.round(Number(value) || 0));
    else if (kind === 'bool') value = Boolean(value);
    else if (typeof value === 'string') {
      value = value.trim();
      if (value === '') value = null;
    }
    sets.push(key + ' = $' + idx);
    values.push(value);
    idx += 1;
  }

  if (sets.length === 0) {
    const rows = await db.query('SELECT * FROM public.settings WHERE id = 1');
    return { ok: true, settings: rows[0] || null };
  }

  const sql = 'UPDATE public.settings SET ' + sets.join(', ') + ' WHERE id = 1 RETURNING *';
  const rows = await db.query(sql, values);
  return { ok: true, settings: rows[0] };
}
