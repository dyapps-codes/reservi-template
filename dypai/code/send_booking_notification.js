async function main(data, { db, env }) {
  const apiKey = env && (env.RESEND_API_KEY || (typeof process !== 'undefined' && process.env && process.env.RESEND_API_KEY));
  const fromEmail = (env && env.RESEND_FROM_EMAIL) || (typeof process !== 'undefined' && process.env && process.env.RESEND_FROM_EMAIL) || 'no-reply@example.com';
  const appUrl = (env && env.PUBLIC_APP_URL) || (typeof process !== 'undefined' && process.env && process.env.PUBLIC_APP_URL) || '';

  const bookingId = String(data.booking_id || '').trim();
  const template = String(data.template || 'confirmation').trim();
  if (!bookingId) throw new Error('booking_id is required');

  const rows = await db.query(
    'SELECT b.id, b.booking_code, b.cancel_token, b.service_name, b.resource_name, ' +
    'b.starts_at, b.ends_at, b.status, b.notes, b.currency, b.price_cents, ' +
    'c.email, c.full_name, ' +
    's.business_name, s.contact_email, s.contact_phone, s.brand_color, s.locale, s.notifications_enabled ' +
    'FROM public.bookings b ' +
    'JOIN public.customers c ON c.id = b.customer_id ' +
    'CROSS JOIN public.settings s ' +
    'WHERE b.id = $1::uuid AND s.id = 1 LIMIT 1',
    [bookingId],
  );
  const row = rows[0];
  if (!row) throw new Error('Booking not found');
  if (row.notifications_enabled === false) {
    return { ok: true, skipped: true, reason: 'notifications_disabled' };
  }

  const recipient = row.email;
  if (!recipient) return { ok: false, error: 'Customer has no email' };

  const subject = renderSubject(template, row);
  const html = renderHtml(template, row, appUrl);

  if (!apiKey) {
    await db.query(
      'INSERT INTO public.notifications (booking_id, channel, template, recipient, subject, status, error) ' +
      "VALUES ($1::uuid, 'email', $2, $3, $4, 'skipped', 'RESEND_API_KEY not configured')",
      [bookingId, template, recipient, subject],
    );
    return { ok: true, skipped: true, reason: 'no_api_key' };
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: row.business_name + ' <' + fromEmail + '>',
        to: [recipient],
        subject: subject,
        html: html,
        reply_to: row.contact_email,
      }),
    });
  } catch (err) {
    await db.query(
      'INSERT INTO public.notifications (booking_id, channel, template, recipient, subject, status, error) ' +
      "VALUES ($1::uuid, 'email', $2, $3, $4, 'failed', $5)",
      [bookingId, template, recipient, subject, String(err && err.message ? err.message : err)],
    );
    throw err;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    await db.query(
      'INSERT INTO public.notifications (booking_id, channel, template, recipient, subject, status, error, metadata) ' +
      "VALUES ($1::uuid, 'email', $2, $3, $4, 'failed', $5, $6::jsonb)",
      [bookingId, template, recipient, subject, (body && body.message) || ('HTTP ' + response.status), JSON.stringify(body)],
    );
    return { ok: false, error: (body && body.message) || ('Resend error ' + response.status) };
  }

  await db.query(
    'INSERT INTO public.notifications (booking_id, channel, template, recipient, subject, status, provider_id, metadata) ' +
    "VALUES ($1::uuid, 'email', $2, $3, $4, 'sent', $5, $6::jsonb)",
    [bookingId, template, recipient, subject, body.id || null, JSON.stringify(body)],
  );

  return { ok: true, sent: true, provider_id: body.id };
}

function renderSubject(template, row) {
  if (template === 'reminder')     return 'Recordatorio: ' + row.service_name + ' · ' + formatDateTime(row.starts_at, row.locale);
  if (template === 'cancellation') return 'Reserva cancelada · ' + row.booking_code;
  if (template === 'reschedule')   return 'Tu reserva ha cambiado · ' + row.booking_code;
  return 'Reserva confirmada · ' + row.booking_code;
}

function renderHtml(template, row, appUrl) {
  const brand = row.brand_color || '#0ea5e9';
  const when = formatDateTime(row.starts_at, row.locale);
  const cancelUrl = appUrl ? (appUrl.replace(/\/$/, '') + '/r/' + row.booking_code + '?t=' + row.cancel_token) : null;

  const headerLine = template === 'cancellation'
    ? 'Tu reserva ha sido cancelada.'
    : template === 'reminder'
      ? 'Te recordamos tu próxima cita.'
      : template === 'reschedule'
        ? 'Tu reserva tiene un nuevo horario.'
        : 'Hemos recibido tu reserva.';

  const cancelBlock = cancelUrl && template !== 'cancellation'
    ? '<p style="margin:24px 0 0;text-align:center"><a href="' + cancelUrl + '" style="display:inline-block;padding:10px 18px;background:' + brand + ';color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Ver o cancelar reserva</a></p>'
    : '';

  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f4f4f5;padding:32px 0">',
    '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">',
    '<div style="padding:24px 28px;border-bottom:4px solid ' + brand + '">',
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#71717a">' + escape(row.business_name) + '</div>',
    '<h1 style="margin:6px 0 0;font-size:22px;color:#18181b">' + escape(headerLine) + '</h1>',
    '</div>',
    '<div style="padding:24px 28px;color:#18181b">',
    '<p style="margin:0 0 16px;font-size:15px">Hola ' + escape(row.full_name || '') + ',</p>',
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 16px">',
    '<tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:140px">Servicio</td><td style="padding:6px 0;font-size:14px"><strong>' + escape(row.service_name) + '</strong></td></tr>',
    '<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Cuándo</td><td style="padding:6px 0;font-size:14px">' + escape(when) + '</td></tr>',
    row.resource_name ? ('<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Con</td><td style="padding:6px 0;font-size:14px">' + escape(row.resource_name) + '</td></tr>') : '',
    '<tr><td style="padding:6px 0;color:#71717a;font-size:13px">Código</td><td style="padding:6px 0;font-size:14px;font-family:monospace">' + escape(row.booking_code) + '</td></tr>',
    '</table>',
    cancelBlock,
    '<p style="margin:24px 0 0;font-size:12px;color:#71717a">¿Dudas? Contacta con <a href="mailto:' + escape(row.contact_email || '') + '" style="color:' + brand + '">' + escape(row.contact_email || '') + '</a></p>',
    '</div>',
    '<div style="padding:16px 28px;background:#fafafa;color:#a1a1aa;font-size:11px;text-align:center">Powered by <strong>DYPAI</strong></div>',
    '</div></div>',
  ].join('');
}

function formatDateTime(iso, locale) {
  try {
    return new Date(iso).toLocaleString(locale || 'es-ES', { dateStyle: 'full', timeStyle: 'short' });
  } catch {
    return new Date(iso).toString();
  }
}

function escape(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
