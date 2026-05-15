async function main(data, { db }) {
  const serviceId = String(data.service_id || '').trim();
  const dateStr = String(data.date || '').trim();
  const filterResourceId = data.resource_id ? String(data.resource_id).trim() : null;

  if (!serviceId) return { ok: false, error: 'service_id is required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { ok: false, error: 'date must be YYYY-MM-DD' };

  const settingsRows = await db.query('SELECT * FROM public.settings WHERE id = 1');
  const settings = settingsRows[0];
  if (!settings) return { ok: false, error: 'Settings missing' };

  const serviceRows = await db.query(
    'SELECT id, name, duration_minutes, buffer_minutes, capacity, requires_resource, is_active, ' +
    'price_cents, currency, color, slug, description ' +
    'FROM public.services WHERE id = $1::uuid LIMIT 1',
    [serviceId],
  );
  const service = serviceRows[0];
  if (!service || !service.is_active) return { ok: false, error: 'Service not found' };

  const step = settings.slot_step_minutes || 15;
  const tz = settings.timezone || 'UTC';
  const minLeadMs = (settings.min_lead_minutes || 0) * 60 * 1000;
  const earliest = new Date(Date.now() + minLeadMs);
  const windowEnd = new Date(Date.now() + (settings.booking_window_days || 30) * 86400000);

  const resourceRows = service.requires_resource
    ? await db.query(
        'SELECT r.id, r.name, r.slug, r.color, r.capacity, COALESCE(r.timezone, $2) AS timezone ' +
        'FROM public.resources r ' +
        'JOIN public.service_resources sr ON sr.resource_id = r.id ' +
        'WHERE sr.service_id = $1::uuid AND r.is_active = true' +
        (filterResourceId ? ' AND r.id = $3::uuid' : '') +
        ' ORDER BY r.sort_order, r.name',
        filterResourceId ? [serviceId, tz, filterResourceId] : [serviceId, tz],
      )
    : [{ id: null, name: null, slug: null, color: settings.brand_color, capacity: service.capacity, timezone: tz }];

  if (resourceRows.length === 0) return { ok: true, service, slots: [] };

  const resourceIds = resourceRows.filter(r => r.id).map(r => r.id);

  const dayStart = isoForLocalMidnight(dateStr, tz);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  if (dayEnd < earliest || dayStart > windowEnd) return { ok: true, service, slots: [] };

  const rules = resourceIds.length > 0
    ? await db.query(
        'SELECT resource_id, weekday, start_time, end_time FROM public.availability_rules ' +
        'WHERE resource_id = ANY($1::uuid[]) AND is_active = true',
        [resourceIds],
      )
    : [];

  const blocks = await db.query(
    'SELECT resource_id, starts_at, ends_at FROM public.time_blocks ' +
    'WHERE starts_at < $2 AND ends_at > $1 ' +
    'AND (resource_id IS NULL OR resource_id = ANY($3::uuid[]))',
    [dayStart.toISOString(), dayEnd.toISOString(), resourceIds],
  );

  const bookings = resourceIds.length > 0
    ? await db.query(
        'SELECT resource_id, starts_at, ends_at FROM public.bookings ' +
        "WHERE status IN ('pending', 'confirmed') AND starts_at < $2 AND ends_at > $1 " +
        'AND resource_id = ANY($3::uuid[])',
        [dayStart.toISOString(), dayEnd.toISOString(), resourceIds],
      )
    : [];

  const slots = [];
  const duration = service.duration_minutes;
  const buffer = service.buffer_minutes || 0;

  for (const resource of resourceRows) {
    const rzTz = resource.timezone || tz;
    const dow = localWeekday(dayStart, rzTz);
    const resourceRules = rules.filter(rule => rule.resource_id === resource.id);
    if (service.requires_resource && resourceRules.length === 0) continue;

    const ruleSet = service.requires_resource ? resourceRules : [{ start_time: '00:00:00', end_time: '23:59:00', weekday: dow }];

    for (const rule of ruleSet) {
      if (service.requires_resource && rule.weekday !== dow) continue;

      const ruleStart = combineDateTime(dateStr, rule.start_time, rzTz);
      const ruleEnd = combineDateTime(dateStr, rule.end_time, rzTz);
      let cursor = new Date(ruleStart.getTime());

      while (cursor.getTime() + duration * 60000 <= ruleEnd.getTime()) {
        const slotStart = new Date(cursor.getTime());
        const slotEnd = new Date(cursor.getTime() + duration * 60000);
        cursor = new Date(cursor.getTime() + step * 60000);

        if (slotStart < earliest) continue;
        if (slotStart > windowEnd) continue;

        const occupied = bookings.filter(b => b.resource_id === resource.id && new Date(b.starts_at) < new Date(slotEnd.getTime() + buffer * 60000) && new Date(b.ends_at) > slotStart).length;
        if (occupied >= (resource.capacity || 1)) continue;

        const blocked = blocks.some(b => (b.resource_id === null || b.resource_id === resource.id) && new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > slotStart);
        if (blocked) continue;

        slots.push({
          starts_at: slotStart.toISOString(),
          ends_at: slotEnd.toISOString(),
          resource_id: resource.id,
          resource_name: resource.name,
          resource_color: resource.color,
        });
      }
    }
  }

  slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return { ok: true, service, slots };
}

function isoForLocalMidnight(dateStr, tz) {
  const isoUtc = new Date(dateStr + 'T00:00:00Z');
  const offsetMin = timezoneOffsetMinutes(isoUtc, tz);
  return new Date(isoUtc.getTime() - offsetMin * 60000);
}

function combineDateTime(dateStr, timeStr, tz) {
  const time = String(timeStr).split(':');
  const hh = Number(time[0]) || 0;
  const mm = Number(time[1]) || 0;
  const utcGuess = new Date(dateStr + 'T' + pad(hh) + ':' + pad(mm) + ':00Z');
  const offsetMin = timezoneOffsetMinutes(utcGuess, tz);
  return new Date(utcGuess.getTime() - offsetMin * 60000);
}

function localWeekday(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[formatter.format(date)];
}

function timezoneOffsetMinutes(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]));
  const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return (local - date.getTime()) / 60000;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }
