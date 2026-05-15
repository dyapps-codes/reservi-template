async function main(data, { db, user }) {
  const bookingId = String(data.body.booking_id || data.booking_id || '').trim();
  const startsAtStr = String(data.body?.starts_at || data.starts_at || '').trim();
  const newResourceId = (data.body?.resource_id || data.resource_id) ? String(data.body?.resource_id || data.resource_id).trim() : null;
  const note = (data.body?.note || data.note) ? String(data.body?.note || data.note).trim() : null;

  if (!bookingId) throw new Error('booking_id is required');
  if (!startsAtStr) throw new Error('starts_at is required');

  const startsAt = new Date(startsAtStr);
  if (isNaN(startsAt.getTime())) throw new Error('Invalid starts_at');

  await db.query('BEGIN');
  try {
    const current = await db.query(
      'SELECT id, service_id, resource_id, starts_at, ends_at, duration_minutes, status, service_name, resource_name ' +
      'FROM public.bookings WHERE id = $1::uuid FOR UPDATE',
      [bookingId],
    );
    if (!current[0]) throw new Error('Booking not found');
    const booking = current[0];
    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'no_show') {
      throw new Error('Cannot reschedule a ' + booking.status + ' booking');
    }

    const targetResourceId = newResourceId || booking.resource_id;
    const endsAt = new Date(startsAt.getTime() + (booking.duration_minutes * 60000));

    if (targetResourceId) {
      const overlap = await db.query(
        'SELECT count(*)::int AS n FROM public.bookings ' +
        "WHERE resource_id = $1::uuid AND status IN ('pending', 'confirmed') " +
        'AND id <> $2::uuid AND starts_at < $4 AND ends_at > $3',
        [targetResourceId, bookingId, startsAt.toISOString(), endsAt.toISOString()],
      );
      if ((overlap[0] && overlap[0].n) > 0) {
        throw new Error('Resource is already booked at the requested time');
      }

      const blocked = await db.query(
        'SELECT count(*)::int AS n FROM public.time_blocks ' +
        'WHERE (resource_id = $1::uuid OR resource_id IS NULL) AND starts_at < $3 AND ends_at > $2',
        [targetResourceId, startsAt.toISOString(), endsAt.toISOString()],
      );
      if ((blocked[0] && blocked[0].n) > 0) throw new Error('Selected slot is blocked');
    }

    let resourceName = booking.resource_name;
    if (newResourceId && newResourceId !== booking.resource_id) {
      const r = await db.query('SELECT name FROM public.resources WHERE id = $1::uuid', [newResourceId]);
      resourceName = (r[0] && r[0].name) || null;
    }

    const updated = await db.query(
      'UPDATE public.bookings SET starts_at = $2, ends_at = $3, resource_id = $4, resource_name = $5 ' +
      'WHERE id = $1::uuid ' +
      'RETURNING id, booking_code, starts_at, ends_at, resource_id, resource_name, status',
      [bookingId, startsAt.toISOString(), endsAt.toISOString(), targetResourceId, resourceName],
    );

    await db.query(
      'INSERT INTO public.booking_status_events (booking_id, actor_user_id, event_type, message, metadata) ' +
      "VALUES ($1::uuid, $2, 'rescheduled', $3, $4::jsonb)",
      [
        bookingId,
        (user && user.id) || null,
        note || ('Rescheduled to ' + startsAt.toISOString()),
        JSON.stringify({
          from: { starts_at: booking.starts_at, ends_at: booking.ends_at, resource_id: booking.resource_id },
          to: { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), resource_id: targetResourceId },
        }),
      ],
    );

    await db.query('COMMIT');
    return { ok: true, booking: updated[0] };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
