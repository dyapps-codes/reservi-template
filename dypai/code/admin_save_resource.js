function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

const VALID_KINDS = ['staff', 'room', 'equipment'];

async function main(data, { db }) {
  const name = String(data.name || '').trim();
  if (!name) throw new Error('Resource name is required');
  const slug = slugify(data.slug || name);
  if (!slug) throw new Error('Resource slug is required');

  const kind = VALID_KINDS.includes(data.kind) ? data.kind : 'staff';
  const description = data.description ? String(data.description).trim() : null;
  const avatarUrl = data.avatar_url ? String(data.avatar_url).trim() : null;
  const color = data.color ? String(data.color).trim() : '#0ea5e9';
  const capacity = Math.max(1, Math.floor(Number(data.capacity) || 1));
  const timezone = data.timezone ? String(data.timezone).trim() : null;
  const sortOrder = Number.isFinite(Number(data.sort_order)) ? Math.floor(Number(data.sort_order)) : 0;
  const isActive = data.is_active === undefined ? true : Boolean(data.is_active);
  const rules = Array.isArray(data.rules) ? data.rules : null;

  await db.query('BEGIN');
  try {
    let row;
    if (data.id) {
      const rows = await db.query(
        'UPDATE public.resources SET name=$1, slug=$2, kind=$3, description=$4, avatar_url=$5, color=$6, capacity=$7, timezone=$8, sort_order=$9, is_active=$10 ' +
        'WHERE id=$11::uuid RETURNING *',
        [name, slug, kind, description, avatarUrl, color, capacity, timezone, sortOrder, isActive, String(data.id)],
      );
      if (!rows[0]) throw new Error('Resource not found');
      row = rows[0];
    } else {
      const rows = await db.query(
        'INSERT INTO public.resources (name, slug, kind, description, avatar_url, color, capacity, timezone, sort_order, is_active) ' +
        'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
        [name, slug, kind, description, avatarUrl, color, capacity, timezone, sortOrder, isActive],
      );
      row = rows[0];
    }

    if (rules !== null) {
      await db.query('DELETE FROM public.availability_rules WHERE resource_id = $1::uuid', [row.id]);
      for (const rule of rules) {
        const weekday = Math.max(0, Math.min(6, Math.floor(Number(rule.weekday) || 0)));
        const startTime = String(rule.start_time || '').trim();
        const endTime = String(rule.end_time || '').trim();
        if (!startTime || !endTime) continue;
        await db.query(
          'INSERT INTO public.availability_rules (resource_id, weekday, start_time, end_time) VALUES ($1::uuid, $2, $3::time, $4::time)',
          [row.id, weekday, startTime, endTime],
        );
      }
    }

    await db.query('COMMIT');
    return { ok: true, resource: row };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
