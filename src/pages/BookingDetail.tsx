import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CalendarPlus, CheckCircle2, Clock, Loader2, Mail, MapPin, Phone, Scissors, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dypai } from '@/lib/dypai'
import { firstRow } from '@/lib/format'

type PublicBooking = {
  id: string
  booking_code: string
  cancel_token: string
  service_name: string
  resource_name?: string | null
  starts_at: string
  ends_at: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  price_cents: number
  currency: string
  notes?: string | null
  cancellation_reason?: string | null
  customer: { full_name: string; email: string; phone?: string | null }
  business: {
    name: string
    tagline?: string
    contact_email?: string
    contact_phone?: string
    timezone?: string
    cancellation_lead_minutes: number
    brand_color?: string
  }
}

export function BookingDetail() {
  const { code } = useParams<{ code: string }>()
  const [search] = useSearchParams()
  const token = search.get('t') || ''
  const [booking, setBooking] = useState<PublicBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await dypai.api.get('lookup-booking-public', { params: { booking_code: code, cancel_token: token } })
    const row = firstRow<{ booking: PublicBooking }>(data)
    setBooking(row?.booking || null)
    setLoading(false)
  }

  useEffect(() => { if (code && token) load() }, [code, token])

  async function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking) return
    setCancelling(true)
    const { data, error } = await dypai.api.post('cancel-booking-public', {
      booking_code: booking.booking_code,
      cancel_token: booking.cancel_token,
      reason: reason || undefined,
    })
    setCancelling(false)
    if (error) { toast.error(error.message ?? 'No se pudo cancelar'); return }
    const result = firstRow<{ ok: boolean; error?: string }>(data)
    if (!result?.ok) { toast.error(result?.error ?? 'No se pudo cancelar'); return }
    toast.success('Reserva cancelada')
    setConfirmCancel(false)
    await load()
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-zinc-50"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  if (!booking) {
    return (
      <FrameWrap>
        <Card className="mx-auto mt-16 max-w-lg">
          <CardContent className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Reserva no encontrada</h1>
            <p className="text-sm text-muted-foreground">El enlace puede haber caducado o el código no coincide.</p>
            <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
          </CardContent>
        </Card>
      </FrameWrap>
    )
  }

  const brand = booking.business.brand_color || '#0ea5e9'
  const startsAt = new Date(booking.starts_at)
  const isCancelled = booking.status === 'cancelled' || booking.status === 'no_show' || booking.status === 'completed'
  const minLeadMs = (booking.business.cancellation_lead_minutes || 0) * 60000
  const insideWindow = startsAt.getTime() - Date.now() >= minLeadMs

  return (
    <FrameWrap brandName={booking.business.name}>
      <main className="mx-auto max-w-xl px-4 py-10">
        <Card className="overflow-hidden">
          <div className="px-6 py-5" style={{ background: brand + '0d', borderBottom: '4px solid ' + brand }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tu reserva</p>
                <h1 className="mt-1 text-2xl font-semibold">{booking.service_name}</h1>
              </div>
              <Badge className={statusClass(booking.status)} variant="outline">{statusLabel(booking.status)}</Badge>
            </div>
          </div>
          <CardContent className="space-y-4 p-6">
            <DetailRow icon={Clock} label="Cuándo" value={startsAt.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) + ' · ' + booking.duration_minutes + ' min'} />
            {booking.resource_name && <DetailRow icon={Scissors} label="Con" value={booking.resource_name} />}
            <DetailRow icon={Mail} label="Confirmación" value={booking.customer.email + ' · ' + booking.booking_code} mono />
            {booking.business.contact_email && <DetailRow icon={Mail} label="Negocio" value={booking.business.contact_email} />}
            {booking.business.contact_phone && <DetailRow icon={Phone} label="Teléfono" value={booking.business.contact_phone} />}
            {booking.business.timezone && <DetailRow icon={MapPin} label="Zona horaria" value={booking.business.timezone} />}

            {booking.cancellation_reason && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motivo de cancelación</span>
                <p className="mt-1">{booking.cancellation_reason}</p>
              </div>
            )}

            {!isCancelled && (
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Button asChild variant="outline">
                  <a href={googleCalendarUrl(booking)} target="_blank" rel="noreferrer"><CalendarPlus className="h-4 w-4" /> Google Calendar</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={icsDataUrl(booking)} download={`reserva-${booking.booking_code}.ics`}><CalendarPlus className="h-4 w-4" /> .ics (Apple/Outlook)</a>
                </Button>
              </div>
            )}

            {!isCancelled && (
              <div className="border-t pt-4">
                {insideWindow ? (
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmCancel(true)}>
                    <XCircle className="h-4 w-4" /> Cancelar reserva
                  </Button>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Esta reserva ya no se puede cancelar online (ventana mínima: {booking.business.cancellation_lead_minutes} min). Contacta directamente.
                  </p>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                {booking.status === 'cancelled' ? 'Reserva cancelada.' : booking.status === 'completed' ? 'Reserva completada.' : 'Marcada como no presentada.'}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Quieres reservar otra cita? <Link to="/book" className="font-medium text-primary hover:underline">Reservar de nuevo</Link>
        </p>
      </main>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar tu reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción liberará tu hueco. Si cambias de idea, tendrás que volver a reservar según disponibilidad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleCancel} className="space-y-3">
            <Textarea placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Volver</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </FrameWrap>
  )
}

function FrameWrap({ children, brandName }: { children: React.ReactNode; brandName?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mi reserva</p>
            <h1 className="text-lg font-semibold">{brandName || 'Reservi'}</h1>
          </div>
          <Button variant="ghost" size="sm" asChild><Link to="/">Inicio</Link></Button>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-[11px] text-muted-foreground">
        <a href="https://www.dypai.ai/" target="_blank" rel="noreferrer" className="opacity-60 transition hover:opacity-100">
          Powered by <span className="font-semibold tracking-wide">DYPAI</span>
        </a>
      </footer>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={'mt-0.5 text-sm break-words ' + (mono ? 'font-mono' : '')}>{value}</div>
      </div>
    </div>
  )
}

function statusLabel(s: string) {
  if (s === 'pending') return 'Pendiente'
  if (s === 'confirmed') return 'Confirmada'
  if (s === 'completed') return 'Completada'
  if (s === 'cancelled') return 'Cancelada'
  if (s === 'no_show') return 'No presentada'
  return s
}

function statusClass(s: string) {
  if (s === 'pending')   return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
  if (s === 'confirmed') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
  if (s === 'completed') return 'bg-blue-500/10 text-blue-700 border-blue-500/30'
  if (s === 'cancelled') return 'bg-rose-500/10 text-rose-700 border-rose-500/30'
  if (s === 'no_show')   return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  return ''
}

function gcalDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function googleCalendarUrl(b: PublicBooking) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: b.service_name + ' · ' + b.business.name,
    dates: gcalDate(b.starts_at) + '/' + gcalDate(b.ends_at),
    details: 'Reserva ' + b.booking_code + (b.resource_name ? ' con ' + b.resource_name : '') + (b.notes ? '\n\n' + b.notes : ''),
  })
  return 'https://www.google.com/calendar/render?' + params.toString()
}

function icsDataUrl(b: PublicBooking) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reservi//EN',
    'BEGIN:VEVENT',
    'UID:' + b.id + '@reservi',
    'DTSTAMP:' + gcalDate(new Date().toISOString()),
    'DTSTART:' + gcalDate(b.starts_at),
    'DTEND:' + gcalDate(b.ends_at),
    'SUMMARY:' + (b.service_name + ' · ' + b.business.name).replace(/[\n,;]/g, ' '),
    'DESCRIPTION:Reserva ' + b.booking_code + (b.resource_name ? ' con ' + b.resource_name : ''),
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'))
}
