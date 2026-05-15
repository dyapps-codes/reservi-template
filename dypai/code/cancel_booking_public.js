async function main(data, { db }) {
  const code = String(data.booking_code || '').trim().toUpperCase();
  const token = String(data.cancel_token || '').trim();
  const reason = data.reason ? String(data.reason).trim() : null;

  if (!code || !token) return { ok: false, error: 'Booking code and token are required' };

  const settingsRows = await db.query('SELECT cancellation_lead_minutes FROM public.settings WHERE id = 1');
  const minLead = (settingsRows[0] && settingsRows[0].cancellation_lead_minutes) || 0;

  await db.query('BEGIN');
  try {
    const rows = await db.query(
      'SELECT id, status, starts_at FROM public.bookings ' +
      'WHERE upper(booking_code) = $1 AND cancel_token = $2 FOR UPDATE',
      [code, token],
    );
    if (!rows[0]) {
      await db.query('ROLLBACK');
      return { ok: false, error: 'Booking not found' };
    }
    const booking = rows[0];
    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'no_show') {
      await db.query('ROLLBACK');
      return { ok: false, error: 'This booking can no longer be cancelled (status: ' + booking.status + ')' };
    }

    const startsAt = new Date(booking.starts_at);
    const minLeadMs = minLead * 60000;
    if (startsAt.getTime() - Date.now() < minLeadMs) {
      await db.query('ROLLBACK');
      return { ok: false, error: 'Cancellation window has passed (' + minLead + ' minutes minimum)' };
    }

    const updated = await db.query(
      "UPDATE public.bookings SET status = 'cancelled', cancellation_reason = $2, cancelled_at = now() " +
      'WHERE id = $1::uuid RETURNING id, booking_code, status, starts_at',
      [booking.id, reason],
    );

    await db.query(
      'INSERT INTO public.booking_status_events (booking_id, event_type, message, metadata) ' +
      "VALUES ($1::uuid, 'cancelled_by_customer', 'Cancelled via public link', $2::jsonb)",
      [booking.id, JSON.stringify({ reason: reason })],
    );

    await db.query('COMMIT');
    return { ok: true, booking: updated[0] };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
