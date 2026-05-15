import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronDown, Filter, Loader2, RefreshCcw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dypai } from '@/lib/dypai'
import { firstRow, formatMoney, fullDate } from '@/lib/format'
import { CreateBookingDialog } from '@/components/CreateBookingDialog'
import type { Booking, BookingStatus, Resource, Service, Slot } from '@/lib/types'

const STATUS_OPTS: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'no_show',   label: 'No-show' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  cancelled: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  no_show: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
}

const PAGE = 50

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ status: '', search: '', resource_id: '', from: '', to: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Booking | null>(null)

  async function load(append = false) {
    if (append) setLoadingMore(true); else setLoading(true)
    const offset = append ? bookings.length : 0
    const params: any = { ...filters, limit: PAGE, offset }
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    const list = await dypai.api.get('admin-list-bookings', { params })
    if (!append) {
      const [srv, res] = await Promise.all([
        dypai.api.get('admin-list-services'),
        dypai.api.get('admin-list-resources'),
      ])
      setServices(firstRow<{ services: Service[] }>(srv.data)?.services || [])
      setResources(firstRow<{ resources: Resource[] }>(res.data)?.resources || [])
    }
    const row = firstRow<{ bookings: Booking[]; total: number }>(list.data)
    const next = row?.bookings || []
    setBookings(append ? [...bookings, ...next] : next)
    setTotal(Number(row?.total || 0))
    if (append) setLoadingMore(false); else setLoading(false)
  }

  useEffect(() => { load(false) }, [filters.status, filters.resource_id, filters.from, filters.to])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter(b =>
      b.booking_code.toLowerCase().includes(q) ||
      b.customer.full_name.toLowerCase().includes(q) ||
      b.customer.email.toLowerCase().includes(q) ||
      b.service_name.toLowerCase().includes(q),
    )
  }, [bookings, filters.search])

  async function updateStatus(booking: Booking, status: BookingStatus, reason?: string) {
    const { error } = await dypai.api.post('admin-update-booking', { booking_id: booking.id, status, cancellation_reason: reason })
    if (error) { toast.error(error.message ?? 'No se pudo actualizar'); return }
    toast.success('Reserva → ' + status)
    setDetail(null)
    await load(false)
  }

  async function reschedule(booking: Booking, starts_at: string, resource_id?: string) {
    const { error } = await dypai.api.post('admin-reschedule-booking', { booking_id: booking.id, starts_at, resource_id })
    if (error) { toast.error(error.message ?? 'No se pudo reagendar'); return }
    toast.success('Reserva reagendada')
    setDetail(null)
    await load(false)
  }

  function clearFilters() {
    setFilters({ status: '', search: '', resource_id: '', from: '', to: '' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filtra, agenda, reagenda o cancela</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Refrescar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><CalendarPlus className="h-4 w-4" /> Nueva reserva</Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar código, cliente, servicio…" className="h-10 pl-9" />
        </div>
        <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
          <SelectTrigger className="h-10 w-full lg:w-44"><Filter className="mr-2 h-3 w-3" /><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s.value || 'all'} value={s.value || 'all'}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.resource_id || 'all'} onValueChange={(v) => setFilters({ ...filters, resource_id: v === 'all' ? '' : v })}>
          <SelectTrigger className="h-10 w-full lg:w-52"><SelectValue placeholder="Recurso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los recursos</SelectItem>
            {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="h-10 lg:w-40" placeholder="Desde" />
        <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '' })} className="h-10 lg:w-40" placeholder="Hasta" />
        {(filters.status || filters.resource_id || filters.from || filters.to || filters.search) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="lg:col-span-5"><X className="h-4 w-4" /> Limpiar filtros</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Cuándo</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">Sin reservas con esos filtros</TableCell></TableRow>
              ) : filtered.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                  <TableCell className="font-mono text-xs">{b.booking_code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.customer.full_name}</div>
                    <div className="text-xs text-muted-foreground">{b.customer.email}</div>
                  </TableCell>
                  <TableCell>{b.service_name}</TableCell>
                  <TableCell className="text-sm">{fullDate(b.starts_at)}</TableCell>
                  <TableCell className="text-sm">{b.resource_name || '—'}</TableCell>
                  <TableCell className="text-right text-sm">{formatMoney(b.price_cents, b.currency)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[b.status] || ''} variant="outline">{b.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {bookings.length < total && (
            <div className="border-t p-3 text-center">
              <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />} Cargar más ({bookings.length} / {total})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBookingDialog open={createOpen} onOpenChange={setCreateOpen} services={services} resources={resources} onCreated={() => load(false)} />
      <BookingDetailDialog
        booking={detail}
        services={services}
        resources={resources}
        onClose={() => setDetail(null)}
        onUpdateStatus={updateStatus}
        onReschedule={reschedule}
      />
    </div>
  )
}

function BookingDetailDialog({ booking, services, resources, onClose, onUpdateStatus, onReschedule }: {
  booking: Booking | null
  services: Service[]
  resources: Resource[]
  onClose: () => void
  onUpdateStatus: (b: Booking, s: BookingStatus, reason?: string) => void
  onReschedule: (b: Booking, starts_at: string, resource_id?: string) => void
}) {
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'info' | 'reschedule'>('info')
  const [date, setDate] = useState('')
  const [resourceId, setResourceId] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null)

  useEffect(() => {
    if (!booking) { setReason(''); setTab('info'); setSlots([]); setPickedSlot(null); return }
    const d = new Date(booking.starts_at)
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    setResourceId('')
  }, [booking?.id])

  useEffect(() => {
    if (!booking || tab !== 'reschedule') return
    const service = services.find(s => s.name === booking.service_name)
    if (!service) return
    setLoadingSlots(true)
    dypai.api.get('get-availability', { params: { service_id: service.id, date, resource_id: resourceId || undefined } }).then(({ data }) => {
      setSlots(firstRow<{ slots: Slot[] }>(data)?.slots || [])
      setLoadingSlots(false)
    })
  }, [booking?.id, tab, date, resourceId])

  if (!booking) return null

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Reserva {booking.booking_code}</span>
            <Badge variant="outline" className="capitalize">{booking.status}</Badge>
          </DialogTitle>
          <DialogDescription>{booking.service_name} · {booking.resource_name || 'Sin recurso'}</DialogDescription>
        </DialogHeader>

        <div className="flex border-b">
          <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>Info</TabBtn>
          <TabBtn active={tab === 'reschedule'} onClick={() => setTab('reschedule')} disabled={['cancelled', 'completed', 'no_show'].includes(booking.status)}>Reagendar</TabBtn>
        </div>

        {tab === 'info' && (
          <div className="space-y-3 text-sm">
            <Row label="Cliente" value={
              <Link to={`/customers/${booking.customer.id}`} className="text-primary hover:underline">{booking.customer.full_name} ({booking.customer.email})</Link>
            } />
            <Row label="Teléfono" value={booking.customer.phone || '—'} />
            <Row label="Cuándo" value={`${fullDate(booking.starts_at)} → ${new Date(booking.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
            <Row label="Precio" value={formatMoney(booking.price_cents, booking.currency)} />
            {booking.notes && <Row label="Notas" value={booking.notes} />}
            {booking.cancellation_reason && <Row label="Motivo cancelación" value={booking.cancellation_reason} />}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Razón (opcional, para cancelaciones / no-show)</p>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cliente lo solicitó, no se presentó…" />
              </div>
            )}
          </div>
        )}

        {tab === 'reschedule' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select value={resourceId || 'any'} onValueChange={(v) => setResourceId(v === 'any' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera disponible</SelectItem>
                  {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              {loadingSlots ? <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : slots.length === 0 ? <p className="text-center text-sm text-muted-foreground">Sin huecos disponibles</p>
              : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {slots.map(s => (
                    <button
                      key={s.starts_at + (s.resource_id || '')}
                      type="button"
                      onClick={() => setPickedSlot(s)}
                      className={'rounded-md border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary hover:bg-primary/5 ' + (pickedSlot?.starts_at === s.starts_at ? 'border-primary bg-primary/10 text-primary' : '')}
                    >
                      {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {s.resource_name && !resourceId && <span className="block text-[10px] text-muted-foreground">{s.resource_name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {tab === 'reschedule' ? (
            <>
              <Button variant="outline" onClick={() => setTab('info')}>Volver</Button>
              <Button onClick={() => pickedSlot && onReschedule(booking, pickedSlot.starts_at, pickedSlot.resource_id || undefined)} disabled={!pickedSlot}>Confirmar nuevo horario</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              {booking.status === 'pending' && <Button onClick={() => onUpdateStatus(booking, 'confirmed')}>Confirmar</Button>}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <>
                  <Button variant="outline" onClick={() => onUpdateStatus(booking, 'completed')}>Completar</Button>
                  <Button variant="outline" onClick={() => onUpdateStatus(booking, 'no_show', reason)}>No-show</Button>
                  <Button variant="destructive" onClick={() => onUpdateStatus(booking, 'cancelled', reason)}>Cancelar</Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function TabBtn({ children, active, onClick, disabled }: { children: React.ReactNode; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={'flex-1 border-b-2 px-3 py-2 text-sm font-medium transition ' + (active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground') + (disabled ? ' cursor-not-allowed opacity-40' : '')}
    >
      {children}
    </button>
  )
}
