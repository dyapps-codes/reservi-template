import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, CircleDollarSign, Sparkles, UserPlus2, UsersRound, Hourglass } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dypai } from '@/lib/dypai'
import { firstRow, formatMoney, timeOfDay, fullDate } from '@/lib/format'
import type { Settings } from '@/lib/types'

type DashboardData = {
  metrics: {
    today_bookings: number
    today_pending: number
    week_bookings: number
    week_revenue_cents: number
    total_customers: number
    active_services: number
    active_resources: number
  }
  today: Array<{ id: string; booking_code: string; service_name: string; resource_name?: string; starts_at: string; ends_at: string; status: string; customer_name: string; customer_email: string; customer_phone?: string }>
  upcoming: Array<{ id: string; booking_code: string; service_name: string; resource_name?: string; starts_at: string; status: string; customer_name: string }>
  chart_14d: Array<{ day: string; count: number }>
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  cancelled: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  no_show: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([
      dypai.api.get('admin-dashboard'),
      dypai.api.get('admin-get-settings'),
    ]).then(([dashboardRes, settingsRes]) => {
      if (!mounted) return
      const row = firstRow<DashboardData>(dashboardRes.data)
      const settingsRow = firstRow<{ settings: Settings }>(settingsRes.data)
      setData(row || null)
      setSettings(settingsRow?.settings || null)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const m = data?.metrics
  const currency = settings?.currency || 'EUR'
  const locale = settings?.locale || 'es-ES'
  const max14 = Math.max(1, ...(data?.chart_14d || []).map(d => Number(d.count)))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoy en {settings?.business_name || 'tu negocio'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{settings?.tagline || 'Resumen del día y de la semana.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar"><CalendarDays className="h-4 w-4" /> Calendario</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/bookings"><UserPlus2 className="h-4 w-4" /> Nueva reserva</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={CalendarClock} label="Reservas hoy" value={String(m?.today_bookings ?? '—')} hint={`${m?.today_pending ?? 0} pendientes`} loading={loading} />
        <Metric icon={Hourglass}     label="Próximos 7 días" value={String(m?.week_bookings ?? '—')} hint="Confirmadas + pendientes" loading={loading} />
        <Metric icon={CircleDollarSign} label="Ingresos semanales" value={formatMoney(m?.week_revenue_cents ?? 0, currency, locale)} hint="Cobradas y completadas" loading={loading} />
        <Metric icon={UsersRound}    label="Clientes" value={String(m?.total_customers ?? '—')} hint={`${m?.active_resources ?? 0} recursos · ${m?.active_services ?? 0} servicios`} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Agenda de hoy</CardTitle>
              <CardDescription>Reservas activas para la jornada</CardDescription>
            </div>
            <Badge variant="outline">{data?.today.length ?? 0}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.today || []).length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Sin reservas para hoy
              </div>
            )}
            {(data?.today || []).map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                <div className="flex w-16 flex-col items-center rounded bg-muted/50 px-2 py-1.5 text-center">
                  <span className="text-xs font-medium uppercase text-muted-foreground">{timeOfDay(booking.starts_at, locale)}</span>
                  <span className="text-[10px] text-muted-foreground">{timeOfDay(booking.ends_at, locale)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{booking.service_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {booking.customer_name} · {booking.resource_name || 'Sin recurso'}
                  </div>
                </div>
                <Badge className={STATUS_COLORS[booking.status] || ''} variant="outline">{booking.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Reservas · últimos 14 días</CardTitle>
            <CardDescription>Volumen diario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1.5">
              {(data?.chart_14d || []).map((bar) => {
                const height = (Number(bar.count) / max14) * 100
                return (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-primary/20" style={{ height: `${Math.max(2, height)}%` }} />
                    <span className="text-[9px] text-muted-foreground">{new Date(bar.day).getDate()}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Próximas reservas</CardTitle>
          <CardDescription>Siguientes citas confirmadas o pendientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.upcoming || []).length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Nada agendado en los próximos días
            </div>
          )}
          {(data?.upcoming || []).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{b.service_name} · {b.customer_name}</div>
                <div className="text-xs text-muted-foreground">{fullDate(b.starts_at, locale)}{b.resource_name ? ` · ${b.resource_name}` : ''}</div>
              </div>
              <Badge className={STATUS_COLORS[b.status] || ''} variant="outline">{b.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ icon: Icon, label, value, hint, loading }: { icon: any; label: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{loading ? '…' : value}</CardTitle>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      {hint && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  )
}
