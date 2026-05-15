function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

async function main(data, { db }) {
  const name = String(data.name || '').trim();
  if (!name) throw new Error('Service name is required');
  const slug = slugify(data.slug || name);
  if (!slug) throw new Error('Service slug is required');

  const description = data.description ? String(data.description).trim() : null;
  const duration = Math.max(1, Math.floor(Number(data.duration_minutes) || 0));
  const buffer = Math.max(0, Math.floor(Number(data.buffer_minutes) || 0));
  const price = Math.max(0, Math.round(Number(data.price_cents) || 0));
  const currency = (data.currency ? String(data.currency).toUpperCase() : 'EUR').slice(0, 8);
  const color = data.color ? String(data.color).trim() : '#0ea5e9';
  const capacity = Math.max(1, Math.floor(Number(data.capacity) || 1));
  const requiresResource = data.requires_resource === undefined ? true : Boolean(data.requires_resource);
  const isPublic = data.is_public === undefined ? true : Boolean(data.is_public);
  const isActive = data.is_active === undefined ? true : Boolean(data.is_active);
  const sortOrder = Number.isFinite(Number(data.sort_order)) ? Math.floor(Number(data.sort_order)) : 0;
  const resourceIds = Array.isArray(data.resource_ids) ? data.resource_ids.filter(Boolean).map(String) : null;

  await db.query('BEGIN');
  try {
    let row;
    if (data.id) {
      const rows = await db.query(
        'UPDATE public.services SET name=$1, slug=$2, description=$3, duration_minutes=$4, buffer_minutes=$5, ' +
        'price_cents=$6, currency=$7, color=$8, capacity=$9, requires_resource=$10, is_public=$11, is_active=$12, sort_order=$13 ' +
        'WHERE id=$14::uuid RETURNING *',
        [name, slug, description, duration, buffer, price, currency, color, capacity, requiresResource, isPublic, isActive, sortOrder, String(data.id)],
      );
      if (!rows[0]) throw new Error('Service not found');
      row = rows[0];
    } else {
      const rows = await db.query(
        'INSERT INTO public.services (name, slug, description, duration_minutes, buffer_minutes, price_cents, currency, color, capacity, requires_resource, is_public, is_active, sort_order) ' +
        'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
        [name, slug, description, duration, buffer, price, currency, color, capacity, requiresResource, isPublic, isActive, sortOrder],
      );
      row = rows[0];
    }

    if (resourceIds !== null) {
      await db.query('DELETE FROM public.service_resources WHERE service_id = $1::uuid', [row.id]);
      for (const rid of resourceIds) {
        await db.query(
          'INSERT INTO public.service_resources (service_id, resource_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING',
          [row.id, rid],
        );
      }
    }

    await db.query('COMMIT');
    return { ok: true, service: row };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
