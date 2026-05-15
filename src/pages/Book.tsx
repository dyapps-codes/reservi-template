import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, CalendarPlus, CheckCircle2, Clock, Loader2, MapPin, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { dypai } from '@/lib/dypai'
import { firstRow, formatMoney, formatDuration, toIsoDate, timeOfDay } from '@/lib/format'
import type { Service, Settings, Slot } from '@/lib/types'

type PublicData = { settings: Settings; services: (Service & { resources?: { id: string; name: string; color?: string }[] })[] }

type Step = 'service' | 'date' | 'slot' | 'form' | 'confirm'

export function Book() {
  const params = useParams<{ serviceSlug?: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PublicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('service')
  const [serviceId, setServiceId] = useState<string>('')
  const [resourceId, setResourceId] = useState<string>('')
  const [date, setDate] = useState<string>(toIsoDate(new Date()))
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null)
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState<{ booking_code: string; cancel_token?: string; service_name: string; resource_name?: string | null; starts_at: string; ends_at: string; id: string } | null>(null)

  useEffect(() => {
    dypai.api.get('list-public-services').then(({ data }) => {
      const row = firstRow<PublicData>(data)
      if (row) {
        setData(row)
        if (params.serviceSlug) {
          const match = row.services.find(s => s.slug === params.serviceSlug)
          if (match) { setServiceId(match.id); setStep('date') }
        }
      }
      setLoading(false)
    })
  }, [params.serviceSlug])

  const service = useMemo(() => data?.services.find(s => s.id === serviceId), [data, serviceId])
  const settings = data?.settings

  useEffect(() => {
    if (!serviceId || step !== 'slot') return
    setLoadingSlots(true)
    dypai.api.get('get-availability', { params: { service_id: serviceId, date, resource_id: resourceId || undefined } }).then(({ data }) => {
      const row = firstRow<{ slots: Slot[] }>(data)
      setSlots(row?.slots || [])
      setLoadingSlots(false)
    })
  }, [serviceId, resourceId, date, step])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pickedSlot || !serviceId) return
    setSaving(true)
    const { data: response, error } = await dypai.api.post('create-public-booking', {
      service_id: serviceId,
      resource_id: pickedSlot.resource_id || undefined,
      starts_at: pickedSlot.starts_at,
      ...form,
    })
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo crear la reserva'); return }
    const result = firstRow<any>(response)
    const booking = result?.result?.booking || result?.booking
    if (booking) {
      setConfirmation({
        id: booking.id,
        booking_code: booking.booking_code,
        cancel_token: booking.cancel_token,
        service_name: booking.service_name,
        resource_name: booking.resource_name,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
      })
      setStep('confirm')
    } else {
      toast.success('Reserva creada')
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reservar online</p>
            <h1 className="text-lg font-semibold" style={{ color: settings?.brand_color || undefined }}>{settings?.business_name || 'Reservi'}</h1>
          </div>
          <Button variant="ghost" size="sm" asChild><Link to="/login">Acceso staff</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Stepper step={step} />

        {step === 'service' && (
          <div className="mt-6 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">¿Qué quieres reservar?</h2>
            <p className="text-sm text-muted-foreground">{settings?.tagline}</p>
            <div className="mt-4 grid gap-3">
              {(data?.services || []).filter(s => s.is_public !== false).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServiceId(s.id); setStep('date') }}
                  className="group flex items-center gap-4 rounded-xl border bg-white p-4 text-left transition hover:border-primary hover:shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ background: `${s.color}1a`, color: s.color }}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.description || `Sesión de ${formatDuration(s.duration_minutes)}`}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{s.price_cents > 0 ? formatMoney(s.price_cents, s.currency, settings?.locale) : 'Gratis'}</div>
                    <div className="text-xs text-muted-foreground">{formatDuration(s.duration_minutes)}</div>
                  </div>
                </button>
              ))}
              {(data?.services || []).length === 0 && (
                <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">No hay servicios publicados todavía.</div>
              )}
            </div>
          </div>
        )}

        {step === 'date' && service && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={() => setStep('service')}><ArrowLeft className="h-4 w-4" /></Button>
              <span>{service.name} · {formatDuration(service.duration_minutes)}</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Elige una fecha</h2>
            <Card>
              <CardContent className="space-y-3 p-4">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={toIsoDate(new Date())} />
                {(service.resources || []).length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recurso (opcional)</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setResourceId('')} className={pillClass(resourceId === '')}>Cualquiera</button>
                      {(service.resources || []).map((r) => (
                        <button key={r.id} type="button" onClick={() => setResourceId(r.id)} className={pillClass(resourceId === r.id)}>
                          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: r.color || '#999' }} /> {r.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={() => setStep('slot')}>Ver huecos disponibles <ArrowRight className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'slot' && service && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={() => setStep('date')}><ArrowLeft className="h-4 w-4" /></Button>
              <span>{service.name} · {new Date(date).toLocaleDateString(settings?.locale || 'es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            </div>
            {loadingSlots ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : slots.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                <Clock className="mx-auto mb-2 h-6 w-6" /> Sin huecos para esta fecha. Prueba otro día.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.starts_at + (s.resource_id || '')}
                    type="button"
                    onClick={() => { setPickedSlot(s); setStep('form') }}
                    className="rounded-lg border bg-white px-3 py-3 text-sm font-medium transition hover:border-primary hover:bg-primary/5"
                    style={{ borderColor: pickedSlot?.starts_at === s.starts_at ? service.color : undefined }}
                  >
                    {timeOfDay(s.starts_at, settings?.locale)}
                    {s.resource_name && !resourceId && <span className="block text-[10px] text-muted-foreground">{s.resource_name}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'form' && pickedSlot && service && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={() => setStep('slot')}><ArrowLeft className="h-4 w-4" /></Button>
              <span>Confirma tus datos</span>
            </div>
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium"><CalendarIcon className="h-4 w-4" /> {service.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(pickedSlot.starts_at).toLocaleString(settings?.locale || 'es-ES', { dateStyle: 'full', timeStyle: 'short' })}
                    {pickedSlot.resource_name && ` · ${pickedSlot.resource_name}`}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDuration(service.duration_minutes)}</span>
                    <span className="font-semibold">{service.price_cents > 0 ? formatMoney(service.price_cents, service.currency, settings?.locale) : 'Gratis'}</span>
                  </div>
                </div>
                <form onSubmit={submit} className="space-y-3">
                  <Input placeholder="Nombre completo" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
                  <Input type="email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required />
                  <Input placeholder="Teléfono (opcional)" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                  <Textarea placeholder="Notas para el equipo" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                  <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar reserva</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'confirm' && confirmation && (
          <Card className="mt-6">
            <CardContent className="space-y-4 p-8">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="mt-3 text-xl font-semibold">¡Reserva confirmada!</h2>
                <p className="mt-1 text-sm text-muted-foreground">Te enviaremos los detalles a tu email.</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <div><span className="text-muted-foreground">Código: </span><span className="font-mono font-semibold">{confirmation.booking_code}</span></div>
                <div><span className="text-muted-foreground">Servicio: </span>{confirmation.service_name}{confirmation.resource_name ? ` · ${confirmation.resource_name}` : ''}</div>
                <div><span className="text-muted-foreground">Cuándo: </span>{new Date(confirmation.starts_at).toLocaleString(settings?.locale || 'es-ES', { dateStyle: 'full', timeStyle: 'short' })}</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline">
                  <a href={googleCalendarUrl(confirmation, settings?.business_name || '')} target="_blank" rel="noreferrer">
                    <CalendarPlus className="h-4 w-4" /> Google Calendar
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={icsDataUrl(confirmation, settings?.business_name || '')} download={`reserva-${confirmation.booking_code}.ics`}>
                    <CalendarPlus className="h-4 w-4" /> .ics (Apple/Outlook)
                  </a>
                </Button>
              </div>
              {confirmation.cancel_token && (
                <Button asChild className="w-full">
                  <Link to={`/r/${confirmation.booking_code}?t=${confirmation.cancel_token}`}>Ver o cancelar mi reserva</Link>
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={() => { setStep('service'); setConfirmation(null) }}>Hacer otra reserva</Button>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-[11px] text-muted-foreground">
        <a
          href="https://www.dypai.ai/"
          target="_blank"
          rel="noreferrer"
          className="opacity-60 transition hover:opacity-100"
        >
          Powered by <span className="font-semibold tracking-wide">DYPAI</span>
        </a>
      </footer>
    </div>
  )
}

function gcalDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function googleCalendarUrl(c: { service_name: string; starts_at: string; ends_at: string; resource_name?: string | null; booking_code: string }, businessName: string) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: c.service_name + ' · ' + businessName,
    dates: gcalDate(c.starts_at) + '/' + gcalDate(c.ends_at),
    details: 'Reserva ' + c.booking_code + (c.resource_name ? ' con ' + c.resource_name : ''),
  })
  return 'https://www.google.com/calendar/render?' + params.toString()
}

function icsDataUrl(c: { id: string; service_name: string; starts_at: string; ends_at: string; resource_name?: string | null; booking_code: string }, businessName: string) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reservi//EN',
    'BEGIN:VEVENT',
    'UID:' + c.id + '@reservi',
    'DTSTAMP:' + gcalDate(new Date().toISOString()),
    'DTSTART:' + gcalDate(c.starts_at),
    'DTEND:' + gcalDate(c.ends_at),
    'SUMMARY:' + (c.service_name + ' · ' + businessName).replace(/[\n,;]/g, ' '),
    'DESCRIPTION:Reserva ' + c.booking_code + (c.resource_name ? ' con ' + c.resource_name : ''),
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'))
}

function pillClass(active: boolean) {
  return 'rounded-full border px-3 py-1 text-xs transition ' + (active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'service', label: 'Servicio' },
    { id: 'date',    label: 'Fecha' },
    { id: 'slot',    label: 'Hueco' },
    { id: 'form',    label: 'Datos' },
    { id: 'confirm', label: 'Confirma' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ' + (i <= idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
          <span className={'text-xs font-medium ' + (i === idx ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
          {i < steps.length - 1 && <div className={'h-px w-6 ' + (i < idx ? 'bg-primary' : 'bg-border')} />}
        </div>
      ))}
    </div>
  )
}
