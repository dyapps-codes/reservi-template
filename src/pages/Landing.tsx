import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Scissors,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { dypai } from '@/lib/dypai'
import { firstRow, formatDuration, formatMoney, localeWeekdayLabel } from '@/lib/format'
import type { Resource, Service, Settings } from '@/lib/types'

type PublicResource = Pick<Resource, 'id' | 'name' | 'kind' | 'color' | 'avatar_url'> & {
  rules?: { weekday: number; start_time: string; end_time: string }[]
}

type PublicData = {
  settings: Settings
  services: (Service & { resources?: { id: string; name: string; color?: string }[] })[]
  resources: PublicResource[]
}

export function Landing() {
  const [data, setData] = useState<PublicData | null>(null)

  useEffect(() => {
    dypai.api.get('list-public-services').then(({ data }) => {
      const row = firstRow<PublicData>(data)
      if (row) setData(row)
    })
  }, [])

  const settings = data?.settings
  const brand = settings?.brand_color || '#0ea5e9'
  const services = data?.services || []
  const resources = data?.resources || []
  const hours = useHoursOverview(resources)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header brand={brand} businessName={settings?.business_name || 'Reservi'} />

      <main>
        <Hero brand={brand} settings={settings} />
        <Stats services={services} resources={resources} />
        <ServicesSection services={services} settings={settings} brand={brand} />
        <ProfessionalsSection resources={resources} brand={brand} />
        <HowItWorks brand={brand} />
        <HoursAndContact hours={hours} settings={settings} brand={brand} />
        <FaqSection brand={brand} settings={settings} />
        <FinalCta brand={brand} />
      </main>

      <Footer settings={settings} />
    </div>
  )
}

function Header({ brand, businessName }: { brand: string; businessName: string }) {
  const links = [
    { href: '#services', label: 'Servicios' },
    { href: '#team', label: 'Equipo' },
    { href: '#how', label: 'Cómo reservar' },
    { href: '#hours', label: 'Horarios' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contacto' },
  ]
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg" style={{ background: brand + '22', color: brand }}>
            <Scissors className="size-4" />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.18em]">{businessName}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          {links.map(l => <a key={l.href} href={l.href} className="hover:text-white">{l.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden text-zinc-400 hover:text-white sm:inline-flex">
            <Link to="/login">Staff</Link>
          </Button>
          <Button asChild size="sm" className="text-zinc-950" style={{ background: brand }}>
            <Link to="/book">Reservar <ArrowRight className="size-4" /></Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-300 md:hidden" aria-label="Menú"><Menu className="size-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-white/10 bg-zinc-950 text-zinc-200">
              <div className="mt-8 flex flex-col gap-1">
                {links.map(l => (
                  <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm hover:bg-white/5">{l.label}</a>
                ))}
                <Link to="/login" className="mt-3 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-white/5">Acceso staff</Link>
                <Link to="/book" className="mt-2 rounded-md px-3 py-2 text-center text-sm font-semibold text-zinc-950" style={{ background: brand }}>Reservar</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function Hero({ brand, settings }: { brand: string; settings?: Settings }) {
  const heroImage = settings?.hero_image_url
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      {heroImage && (
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/95 to-transparent" />
      <div
        className="absolute -top-40 right-0 hidden h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl md:block"
        style={{ background: brand }}
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge variant="outline" className="border-white/15 bg-white/5 text-xs uppercase tracking-[0.2em] text-zinc-300">
            <Sparkles className="mr-1.5 size-3" /> Reserva online · 24/7
          </Badge>
          <h1 className="mt-6 text-5xl font-black uppercase leading-[0.94] tracking-[-0.04em] sm:text-7xl">
            {settings?.business_name || 'Reservi'}
            <span className="mt-2 block" style={{ color: brand }}>· tu cita en 60 segundos</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
            {settings?.tagline || 'Elige servicio, día y hora. Llega y siéntate. Sin llamadas.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-zinc-950" style={{ background: brand }}>
              <Link to="/book">Reservar ahora <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <a href="#services">Ver servicios</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-1.5"><Star className="size-4" style={{ color: brand }} /> Reservas confirmadas al instante</div>
            <div className="hidden items-center gap-1.5 sm:flex"><Clock className="size-4" style={{ color: brand }} /> Cambia o cancela fácil</div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-2 rounded-3xl" style={{ background: brand + '22' }} />
            <Card className="relative border-white/10 bg-zinc-900 text-zinc-100">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Tu próxima cita</p>
                    <p className="mt-1 text-lg font-semibold">Corte clásico · 30 min</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-lg text-zinc-950" style={{ background: brand }}>
                    <CalendarCheck className="size-5" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['09:30', '10:00', '10:30', '11:00', '11:30', '12:00'].map((slot, i) => (
                    <div
                      key={slot}
                      className={
                        'rounded-md border border-white/10 px-2 py-2 text-center text-xs font-medium ' +
                        (i === 2 ? 'text-zinc-950' : 'bg-white/5 text-zinc-300')
                      }
                      style={i === 2 ? { background: brand, borderColor: brand } : undefined}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full text-zinc-950" style={{ background: brand }}>
                  <Link to="/book">Coger este hueco</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats({ services, resources }: { services: Service[]; resources: PublicResource[] }) {
  const stats = [
    { value: services.length, label: 'Servicios' },
    { value: resources.length, label: 'Profesionales / espacios' },
    { value: '24/7', label: 'Reserva online' },
    { value: '60s', label: 'En reservar' },
  ]
  return (
    <section className="border-b border-white/5">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden bg-white/5 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-950 px-6 py-8 text-center">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ServicesSection({ services, settings, brand }: { services: Service[]; settings?: Settings; brand: string }) {
  return (
    <section id="services" className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Servicios</p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Lo que puedes reservar</h2>
          </div>
          <p className="max-w-md text-sm text-zinc-400">
            Cada servicio te muestra al instante los huecos disponibles según el equipo y la sala.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
              Aún no hay servicios publicados.
            </div>
          ) : services.map((s) => (
            <Link
              key={s.id}
              to={`/book/${s.slug}`}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-5 transition hover:border-white/30"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ background: s.color + '22', color: s.color }}>
                  <Scissors className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.name}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{s.description || `Sesión de ${formatDuration(s.duration_minutes)}.`}</p>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Duración</div>
                  <div className="text-sm font-medium">{formatDuration(s.duration_minutes)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Precio</div>
                  <div className="text-base font-semibold">{s.price_cents > 0 ? formatMoney(s.price_cents, s.currency, settings?.locale) : 'Gratis'}</div>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center text-xs font-medium uppercase tracking-wide opacity-70 transition group-hover:opacity-100" style={{ color: brand }}>
                Reservar este servicio <ArrowRight className="ml-1 size-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProfessionalsSection({ resources, brand }: { resources: PublicResource[]; brand: string }) {
  if (resources.length === 0) return null
  return (
    <section id="team" className="border-b border-white/5 bg-zinc-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Equipo</p>
        <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Quién te atiende</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4 transition hover:border-white/20">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white" style={{ background: r.color }}>
                  {r.kind === 'staff' ? r.name.charAt(0) : <UserRound className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">{r.kind === 'staff' ? 'Profesional' : r.kind === 'room' ? 'Sala' : 'Equipamiento'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqSection({ brand, settings }: { brand: string; settings?: Settings }) {
  const minLead = settings?.min_lead_minutes ?? 60
  const window = settings?.booking_window_days ?? 30
  const cancelLead = (settings as any)?.cancellation_lead_minutes ?? 720
  const items = [
    {
      q: '¿Cómo funciona la reserva online?',
      a: 'Eliges servicio, miras los huecos reales en la agenda, dejas tus datos y recibes un email con el código y un enlace para gestionar tu cita.',
    },
    {
      q: '¿Con cuánta antelación tengo que reservar?',
      a: 'La reserva más cercana posible es ' + minLead + ' minutos antes de la cita. Puedes reservar hasta ' + window + ' días en el futuro.',
    },
    {
      q: '¿Puedo cancelar o cambiar mi reserva?',
      a: 'Sí — desde el email de confirmación o desde tu enlace personal. La cancelación online se cierra ' + Math.round(cancelLead / 60) + 'h antes de la cita; pasado ese punto, contáctanos directamente.',
    },
    {
      q: '¿Necesito crear cuenta?',
      a: 'No. Reservas con tu nombre y email. La cuenta es opcional y solo necesaria si gestionas el negocio (acceso staff).',
    },
    {
      q: '¿Cuánto cuesta?',
      a: 'Cada servicio muestra su precio en la lista. El cobro se gestiona en el local salvo que se indique otro método.',
    },
  ]
  return (
    <section id="faq" className="border-b border-white/5">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Preguntas frecuentes</p>
        <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Lo que sueles preguntar</h2>
        <Accordion type="single" collapsible className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-900/40">
          {items.map((item, i) => (
            <AccordionItem key={i} value={'item-' + i} className="border-b-0 px-5">
              <AccordionTrigger className="text-left text-sm font-medium text-zinc-100 hover:text-white" style={{ '--tw-ring-color': brand } as React.CSSProperties}>{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-zinc-400">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function HowItWorks({ brand }: { brand: string }) {
  const steps = [
    { n: '01', title: 'Elige servicio', desc: 'Mira lo que ofrecemos, duraciones y precios.' },
    { n: '02', title: 'Pick de hueco', desc: 'Te enseñamos los huecos reales de la agenda.' },
    { n: '03', title: 'Tus datos', desc: 'Nombre y email — confirmamos al instante.' },
  ]
  return (
    <section id="how" className="border-b border-white/5 bg-zinc-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cómo funciona</p>
        <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Tres pasos. Sin llamadas.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-white/10 bg-zinc-950 p-6">
              <div className="text-5xl font-black" style={{ color: brand }}>{s.n}</div>
              <div className="mt-4 text-lg font-semibold">{s.title}</div>
              <p className="mt-1 text-sm text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HoursAndContact({ hours, settings, brand }: { hours: { weekday: number; ranges: string[] }[]; settings?: Settings; brand: string }) {
  return (
    <section id="hours" className="border-b border-white/5">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Horarios</p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Cuándo estamos</h2>
          <div className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-900/40">
            {hours.length === 0 ? (
              <div className="p-6 text-sm text-zinc-400">Configura los horarios de tus recursos en el panel admin.</div>
            ) : hours.map((h) => (
              <div key={h.weekday} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium uppercase tracking-wide">{localeWeekdayLabel(h.weekday)}</span>
                <span className="text-zinc-400">{h.ranges.length > 0 ? h.ranges.join(' · ') : 'Cerrado'}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="contact">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Contacto</p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Encuéntranos</h2>
          <div className="mt-8 space-y-3">
            <ContactRow icon={Mail} label="Email" value={settings?.contact_email || 'hola@example.com'} brand={brand} />
            {settings?.contact_phone && <ContactRow icon={Phone} label="Teléfono" value={settings.contact_phone} brand={brand} />}
            <ContactRow icon={MapPin} label="Zona" value={settings?.timezone || 'Europe/Madrid'} brand={brand} />
            <ContactRow icon={Clock} label="Horario" value="Reserva online 24/7" brand={brand} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactRow({ icon: Icon, label, value, brand }: { icon: any; label: string; value: string; brand: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900/40 px-5 py-4">
      <span className="grid size-10 place-items-center rounded-lg" style={{ background: brand + '22', color: brand }}>
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}

function FinalCta({ brand }: { brand: string }) {
  return (
    <section className="border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-5xl font-black uppercase tracking-[-0.03em] sm:text-6xl">
          Reserva sin esperar.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          Mira los huecos reales y confirma en menos de un minuto.
        </p>
        <Button asChild size="lg" className="mt-8 text-zinc-950" style={{ background: brand }}>
          <Link to="/book">Reservar ahora <ArrowRight className="size-4" /></Link>
        </Button>
      </div>
    </section>
  )
}

function Footer({ settings }: { settings?: Settings }) {
  return (
    <footer className="bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span>© {new Date().getFullYear()} {settings?.business_name || 'Reservi'}.</span>
          <span className="opacity-60">·</span>
          <a
            href="https://www.dypai.ai/"
            target="_blank"
            rel="noreferrer"
            className="opacity-70 transition hover:opacity-100"
          >
            Powered by <span className="font-semibold tracking-wide">DYPAI</span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/book" className="hover:text-zinc-300">Reservar</Link>
          <Link to="/login" className="hover:text-zinc-300">Acceso staff</Link>
        </div>
      </div>
    </footer>
  )
}

function useHoursOverview(resources: PublicResource[]) {
  return useMemo(() => {
    const byWeekday = new Map<number, Set<string>>()
    for (const resource of resources) {
      for (const rule of resource.rules || []) {
        const set = byWeekday.get(rule.weekday) || new Set<string>()
        set.add(`${String(rule.start_time).slice(0, 5)}–${String(rule.end_time).slice(0, 5)}`)
        byWeekday.set(rule.weekday, set)
      }
    }
    const order = [1, 2, 3, 4, 5, 6, 0]
    return order.map((weekday) => ({
      weekday,
      ranges: Array.from(byWeekday.get(weekday) || []).sort(),
    }))
  }, [resources])
}
