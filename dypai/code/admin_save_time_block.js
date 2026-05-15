async function main(data, { db, user }) {
  if (data.delete && data.id) {
    const rows = await db.query('DELETE FROM public.time_blocks WHERE id = $1::uuid RETURNING id', [String(data.id)]);
    return { ok: true, deleted: Boolean(rows[0]) };
  }

  const startsAt = data.starts_at ? new Date(String(data.starts_at)) : null;
  const endsAt = data.ends_at ? new Date(String(data.ends_at)) : null;
  if (!startsAt || isNaN(startsAt.getTime())) throw new Error('starts_at is required (ISO datetime)');
  if (!endsAt || isNaN(endsAt.getTime())) throw new Error('ends_at is required (ISO datetime)');
  if (endsAt <= startsAt) throw new Error('ends_at must be after starts_at');

  const resourceId = data.resource_id ? String(data.resource_id).trim() : null;
  const reason = data.reason ? String(data.reason).trim() : null;
  const actor = (user && user.id) || null;

  if (data.id) {
    const rows = await db.query(
      'UPDATE public.time_blocks SET resource_id = $1, starts_at = $2, ends_at = $3, reason = $4 WHERE id = $5::uuid RETURNING *',
      [resourceId, startsAt.toISOString(), endsAt.toISOString(), reason, String(data.id)],
    );
    if (!rows[0]) throw new Error('Time block not found');
    return { ok: true, time_block: rows[0] };
  }

  const rows = await db.query(
    'INSERT INTO public.time_blocks (resource_id, starts_at, ends_at, reason, created_by_user_id) ' +
    'VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [resourceId, startsAt.toISOString(), endsAt.toISOString(), reason, actor],
  );
  return { ok: true, time_block: rows[0] };
}
