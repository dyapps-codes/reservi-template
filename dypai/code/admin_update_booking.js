const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const TRANSITIONS = {
  pending:   ['confirmed', 'cancelled', 'completed', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
};

async function main(data, { db, user }) {
  const bookingId = String(data.booking_id || '').trim();
  const status = String(data.status || '').trim();
  const reason = data.cancellation_reason ? String(data.cancellation_reason).trim() : null;
  const internalNotes = data.internal_notes ? String(data.internal_notes).trim() : null;
  const note = data.note ? String(data.note).trim() : null;

  if (!bookingId) throw new Error('booking_id is required');
  if (!VALID_STATUSES.includes(status)) throw new Error('Invalid status');

  await db.query('BEGIN');
  try {
    const current = await db.query(
      'SELECT id, status FROM public.bookings WHERE id = $1::uuid FOR UPDATE',
      [bookingId],
    );
    if (!current[0]) throw new Error('Booking not found');

    const previous = current[0];
    if (previous.status !== status) {
      const allowed = TRANSITIONS[previous.status] || [];
      if (!allowed.includes(status)) {
        throw new Error('Cannot transition booking from ' + previous.status + ' to ' + status);
      }
    }

    const rows = await db.query(
      'UPDATE public.bookings SET ' +
      '  status = $2, ' +
      '  cancellation_reason = COALESCE($3, cancellation_reason), ' +
      '  internal_notes = COALESCE($4, internal_notes), ' +
      "  confirmed_at = CASE WHEN $2 = 'confirmed' AND confirmed_at IS NULL THEN now() ELSE confirmed_at END, " +
      "  cancelled_at = CASE WHEN $2 = 'cancelled' AND cancelled_at IS NULL THEN now() ELSE cancelled_at END, " +
      "  completed_at = CASE WHEN $2 = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END " +
      'WHERE id = $1::uuid ' +
      'RETURNING id, booking_code, status, starts_at, ends_at, service_name, resource_name, cancellation_reason',
      [bookingId, status, reason, internalNotes],
    );

    const message = note || ('Status changed to ' + status);
    await db.query(
      'INSERT INTO public.booking_status_events (booking_id, actor_user_id, event_type, message, metadata) ' +
      "VALUES ($1::uuid, $2, 'status_changed', $3, $4::jsonb)",
      [
        bookingId,
        (user && user.id) || null,
        message,
        JSON.stringify({ previous_status: previous.status, next_status: status, reason: reason }),
      ],
    );

    await db.query('COMMIT');
    return { ok: true, booking: rows[0] };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
