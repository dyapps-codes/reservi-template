export function formatMoney(cents: number, currency = 'EUR', locale = 'es-ES') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format((cents || 0) / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export function formatDuration(minutes: number) {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function firstRow<T = any>(value: unknown): T | undefined {
  if (Array.isArray(value)) return value[0] as T | undefined
  if (value && typeof value === 'object') return value as T
  return undefined
}

export function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday-first
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function timeOfDay(iso: string, locale = 'es-ES') {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export function fullDate(iso: string, locale = 'es-ES') {
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function localeWeekdayLabel(weekday: number) {
  // backend stores 0=Sunday..6=Saturday — present as Mon-first label
  const indexMap = [6, 0, 1, 2, 3, 4, 5] // index = Mon-first slot, value = backend weekday
  const monFirstIndex = indexMap.indexOf(weekday)
  return WEEKDAY_LABELS[monFirstIndex >= 0 ? monFirstIndex : 0]
}
