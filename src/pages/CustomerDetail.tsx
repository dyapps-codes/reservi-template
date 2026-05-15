import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CheckCircle2, CircleDollarSign, Loader2, Mail, Phone, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dypai } from '@/lib/dypai'
import { firstRow, formatMoney, fullDate } from '@/lib/format'
import type { Customer } from '@/lib/types'

type CustomerData = {
  customer: Customer
  bookings: Array<{
    id: string; booking_code: string; service_name: string; resource_name?: string;
    starts_at: string; ends_at: string; status: string;
    price_cents: number; currency: string; notes?: string; cancellation_reason?: string;
  }>
  stats: { total: number; completed: number; cancelled: number; no_show: number; spent_cents: number }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  cancelled: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  no_show: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
}

export function CustomerDetail() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!params.id) return
    dypai.api.get('admin-get-customer', { params: { id: params.id } }).then(({ data }) => {
      setData(firstRow<CustomerData>(data) || null)
      setLoading(false)
    })
  }, [params.id])

  async function handleDelete() {
    setConfirmDelete(false)
    const { data: response, error } = await dypai.api.post('admin-delete-customer', { id: params.id })
    if (error) { toast.error(error.message ?? 'No se pudo eliminar'); return }
    const result = firstRow<{ ok: boolean; deleted?: boolean; error?: string }>(response)
    if (!result?.ok) { toast.error(result?.error ?? 'No se pudo eliminar'); return }
    toast.success('Cliente eliminado')
    navigate('/customers')
  }

  if (loading) {
    return <div className="flex h-60 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild><Link to="/customers"><ArrowLeft className="h-4 w-4" /> Volver</Link></Button>
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cliente no encontrado</CardContent></Card>
      </div>
    )
  }

  const c = data.customer
  const upcoming = data.bookings.filter(b => new Date(b.starts_at) >= new Date() && (b.status === 'pending' || b.status === 'confirmed'))
  const past = data.bookings.filter(b => !upcoming.includes(b))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to="/customers"><ArrowLeft className="h-4 w-4" /> Clientes</Link></Button>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-semibold text-primary">
            {c.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
              <p className="text-sm text-muted-foreground">Cliente desde {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {c.email}</div>
              {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {c.phone}</div>}
            </div>
            {c.notes && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notas internas</span>
                <p className="mt-1 whitespace-pre-line">{c.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={CalendarClock} label="Total" value={String(data.stats.total)} />
        <StatCard icon={CheckCircle2} label="Completadas" value={String(data.stats.completed)} />
        <StatCard icon={XCircle} label="Canceladas / no-show" value={String(data.stats.cancelled + data.stats.no_show)} />
        <StatCard icon={CircleDollarSign} label="Facturado" value={formatMoney(data.stats.spent_cents, 'EUR')} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Próximas reservas</CardTitle>
            <CardDescription>{upcoming.length} próximas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <EmptyHint label="Sin reservas próximas" />}
            {upcoming.map(b => <BookingRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Histórico</CardTitle>
            <CardDescription>{past.length} reservas pasadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.length === 0 && <EmptyHint label="Sin histórico todavía" />}
            {past.slice(0, 50).map(b => <BookingRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {data.stats.total > 0
                ? 'Este cliente tiene reservas — la eliminación será rechazada por el backend para preservar el histórico. Cancela o anonimiza en su lugar.'
                : 'Esta acción es permanente. ¿Continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"><Icon className="h-4 w-4" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function BookingRow({ booking }: { booking: CustomerData['bookings'][number] }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="flex w-16 flex-col items-center rounded bg-muted/50 px-2 py-1.5 text-center text-xs">
        <span className="font-medium uppercase">{new Date(booking.starts_at).toLocaleDateString('es-ES', { month: 'short' })}</span>
        <span className="text-base font-bold leading-none">{new Date(booking.starts_at).getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{booking.service_name}</span>
          <Badge variant="outline" className={STATUS_COLORS[booking.status] || ''}>{booking.status}</Badge>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{fullDate(booking.starts_at)}{booking.resource_name ? ` · ${booking.resource_name}` : ''}</div>
        {booking.notes && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{booking.notes}</p>}
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div className="font-mono">{booking.booking_code}</div>
        <div className="mt-0.5 text-foreground">{formatMoney(booking.price_cents, booking.currency)}</div>
      </div>
    </div>
  )
}

function EmptyHint({ label }: { label: string }) {
  return <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">{label}</div>
}
