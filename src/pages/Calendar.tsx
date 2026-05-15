import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dypai } from '@/lib/dypai'
import { addDays, firstRow, startOfWeek, timeOfDay, toIsoDate } from '@/lib/format'
import { CreateBookingDialog, type CreateBookingPrefill } from '@/components/CreateBookingDialog'
import type { Booking, Resource, Service, TimeBlock } from '@/lib/types'

type View = 'day' | 'week'

export function Calendar() {
  const [view, setView] = useState<View>('day')
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createPrefill, setCreatePrefill] = useState<CreateBookingPrefill>({})

  const [blockOpen, setBlockOpen] = useState(false)
  const [blockForm, setBlockForm] = useState<{ resource_id: string; starts_at: string; ends_at: string; reason: string }>({
    resource_id: '', starts_at: '', ends_at: '', reason: '',
  })
  const [savingBlock, setSavingBlock] = useState(false)

  const range = useMemo(() => {
    if (view === 'day') {
      const start = new Date(anchor); start.setHours(0,0,0,0)
      const end = addDays(start, 1)
      return { start, end, days: [start] }
    }
    const start = startOfWeek(anchor)
    const end = addDays(start, 7)
    return { start, end, days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) }
  }, [view, anchor])

  const { hourStart, hourEnd } = useHourBounds(resources, range.days)

  async function load() {
    setLoading(true)
    const [bRes, tbRes, rRes, sRes] = await Promise.all([
      dypai.api.get('admin-list-bookings', { params: { from: range.start.toISOString(), to: range.end.toISOString(), limit: 500 } }),
      dypai.api.get('admin-list-time-blocks', { params: { from: range.start.toISOString(), to: range.end.toISOString() } }),
      dypai.api.get('admin-list-resources'),
      dypai.api.get('admin-list-services'),
    ])
    setBookings(firstRow<{ bookings: Booking[] }>(bRes.data)?.bookings || [])
    setBlocks(firstRow<{ time_blocks: TimeBlock[] }>(tbRes.data)?.time_blocks || [])
    setResources(firstRow<{ resources: Resource[] }>(rRes.data)?.resources || [])
    setServices(firstRow<{ services: Service[] }>(sRes.data)?.services || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [range.start.getTime(), view])

  function openBlockDialog(prefillStart?: Date, resourceId?: string) {
    const start = prefillStart ? new Date(prefillStart) : new Date()
    if (!prefillStart) start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60000)
    setBlockForm({ resource_id: resourceId || '', starts_at: localIso(start), ends_at: localIso(end), reason: '' })
    setBlockOpen(true)
  }

  async function saveBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingBlock(true)
    const { error } = await dypai.api.post('admin-save-time-block', {
      resource_id: blockForm.resource_id || undefined,
      starts_at: new Date(blockForm.starts_at).toISOString(),
      ends_at: new Date(blockForm.ends_at).toISOString(),
      reason: blockForm.reason || undefined,
    })
    setSavingBlock(false)
    if (error) { toast.error(error.message ?? 'No se pudo guardar'); return }
    toast.success('Bloqueo creado')
    setBlockOpen(false)
    await load()
  }

  async function removeBlock(id: string) {
    const { error } = await dypai.api.post('admin-save-time-block', { id, delete: true })
    if (error) { toast.error(error.message ?? 'No se pudo eliminar'); return }
    toast.success('Bloqueo eliminado')
    await load()
  }

  function openCreateAt(starts_at: Date, resourceId?: string) {
    const date = toIsoDate(starts_at)
    const isoLocal = localIso(starts_at)
    setCreatePrefill({ date, starts_at: isoLocal, resourceId })
    setCreateOpen(true)
  }

  function navPrev() { setAnchor(addDays(anchor, view === 'day' ? -1 : -7)) }
  function navNext() { setAnchor(addDays(anchor, view === 'day' ? 1 : 7)) }
  function navToday() { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d) }

  const headerLabel = view === 'day'
    ? anchor.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : `${range.days[0].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${range.days[6].toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const activeResources = resources.filter(r => r.is_active)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="h-9">
              <TabsTrigger value="day" className="text-xs">Día</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={navPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={navToday}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={navNext}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => openBlockDialog()}><Plus className="h-4 w-4" /> Bloquear</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-80 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : view === 'day' ? (
            <DayGrid
              day={range.days[0]}
              hourStart={hourStart}
              hourEnd={hourEnd}
              resources={activeResources}
              bookings={bookings}
              blocks={blocks}
              onClickEmpty={openCreateAt}
              onRemoveBlock={removeBlock}
            />
          ) : (
            <WeekGrid
              days={range.days}
              hourStart={hourStart}
              hourEnd={hourEnd}
              bookings={bookings}
              blocks={blocks}
              resources={activeResources}
              onClickEmpty={openCreateAt}
              onRemoveBlock={removeBlock}
            />
          )}
        </CardContent>
      </Card>

      <CreateBookingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        services={services}
        resources={resources}
        prefill={createPrefill}
        onCreated={load}
      />

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear hueco</DialogTitle>
            <DialogDescription>Vacaciones, comida, evento privado…</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveBlock} className="space-y-3">
            <Select value={blockForm.resource_id || 'all'} onValueChange={(v) => setBlockForm({ ...blockForm, resource_id: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el negocio</SelectItem>
                {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="datetime-local" value={blockForm.starts_at} onChange={(e) => setBlockForm({ ...blockForm, starts_at: e.target.value })} required />
              <Input type="datetime-local" value={blockForm.ends_at} onChange={(e) => setBlockForm({ ...blockForm, ends_at: e.target.value })} required />
            </div>
            <Textarea placeholder="Motivo (opcional)" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} rows={2} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBlockOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingBlock}>{savingBlock && <Loader2 className="h-4 w-4 animate-spin" />} Bloquear</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DayGrid({ day, hourStart, hourEnd, resources, bookings, blocks, onClickEmpty, onRemoveBlock }: {
  day: Date; hourStart: number; hourEnd: number; resources: Resource[]; bookings: Booking[]; blocks: TimeBlock[];
  onClickEmpty: (start: Date, resourceId?: string) => void;
  onRemoveBlock: (id: string) => void;
}) {
  const dayStart = new Date(day); dayStart.setHours(hourStart, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(hourEnd, 0, 0, 0)
  const totalMin = (dayEnd.getTime() - dayStart.getTime()) / 60000
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)

  const dayBookings = bookings.filter(b => sameDay(new Date(b.starts_at), day))
  const dayBlocks = blocks.filter(b => overlapsDay(new Date(b.starts_at), new Date(b.ends_at), day))
  const unassignedBookings = dayBookings.filter(b => !b.resource_name && !resources.length)

  const cols = resources.length || 1
  const colWidth = `minmax(160px, 1fr)`

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <div className="grid border-b bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: `60px repeat(${cols}, ${colWidth})` }}>
          <div className="p-2" />
          {resources.length === 0 ? (
            <div className="border-l p-2 text-center">Sin recursos</div>
          ) : resources.map(r => (
            <div key={r.id} className="border-l p-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                <span className="font-semibold text-foreground">{r.name}</span>
              </div>
              <div className="mt-0.5 text-[10px] capitalize">{r.kind}</div>
            </div>
          ))}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${cols}, ${colWidth})` }}>
          <div className="border-r">
            {hours.map(h => (
              <div key={h} className="h-20 border-b px-2 py-1 text-[11px] text-muted-foreground">{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
          {(resources.length === 0 ? [null as any] : resources).map((resource: Resource | null) => (
            <ResourceColumn
              key={resource?.id || 'none'}
              dayStart={dayStart}
              totalMin={totalMin}
              hours={hours}
              resource={resource || undefined}
              bookings={resource ? dayBookings.filter(b => b.resource_name === resource.name) : unassignedBookings}
              blocks={resource ? dayBlocks.filter(b => b.resource_id === resource.id || b.resource_id === null) : dayBlocks}
              onClickEmpty={(d) => onClickEmpty(d, resource?.id)}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ResourceColumn({ dayStart, totalMin, hours, resource, bookings, blocks, onClickEmpty, onRemoveBlock }: {
  dayStart: Date; totalMin: number; hours: number[]; resource?: Resource;
  bookings: Booking[]; blocks: TimeBlock[];
  onClickEmpty: (start: Date) => void;
  onRemoveBlock: (id: string) => void;
}) {
  function position(start: Date, end: Date) {
    const dayEnd = new Date(dayStart.getTime() + totalMin * 60000)
    const top = Math.max(0, ((start.getTime() - dayStart.getTime()) / 60000) / totalMin * 100)
    const height = Math.max(2, ((Math.min(end.getTime(), dayEnd.getTime()) - Math.max(start.getTime(), dayStart.getTime())) / 60000) / totalMin * 100)
    return { top: `${top}%`, height: `${height}%` }
  }

  function handleHourClick(hour: number, half: 0 | 30) {
    const d = new Date(dayStart)
    d.setHours(hour, half, 0, 0)
    onClickEmpty(d)
  }

  return (
    <div className="relative border-l" style={{ height: `${hours.length * 5}rem` }}>
      {hours.map(h => (
        <div key={h} className="grid h-20 grid-rows-2 border-b">
          <div className="cursor-pointer transition hover:bg-primary/5" onClick={() => handleHourClick(h, 0)} />
          <div className="cursor-pointer border-t border-dashed border-border/40 transition hover:bg-primary/5" onClick={() => handleHourClick(h, 30)} />
        </div>
      ))}
      {blocks.map((b) => {
        const start = new Date(b.starts_at)
        const end = new Date(b.ends_at)
        const pos = position(start, end)
        return (
          <div key={b.id} className="absolute left-1 right-1 flex flex-col gap-0.5 rounded border border-dashed border-zinc-400/40 bg-zinc-200/40 px-1.5 py-1 text-[10px] text-zinc-600" style={pos}>
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">Bloqueo{b.resource_id === null ? ' · Global' : ''}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveBlock(b.id) }} className="text-zinc-500 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
            {b.reason && <span className="truncate">{b.reason}</span>}
          </div>
        )
      })}
      {bookings.map((b) => {
        const start = new Date(b.starts_at)
        const end = new Date(b.ends_at)
        const pos = position(start, end)
        const color = resource?.color || 'hsl(var(--primary))'
        return (
          <div
            key={b.id}
            className="absolute left-1 right-1 flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded border bg-white px-1.5 py-1 text-[11px] shadow-sm hover:shadow-md"
            style={{ ...pos, borderLeft: `3px solid ${color}` }}
            title={`${b.service_name} · ${b.customer.full_name}`}
            onClick={(e) => { e.stopPropagation() }}
          >
            <div className="flex items-center gap-1 font-medium leading-none">
              <span>{timeOfDay(b.starts_at)}</span>
              <Badge variant="outline" className="ml-auto h-4 px-1 text-[9px] capitalize">{b.status}</Badge>
            </div>
            <div className="truncate text-[10px]">{b.customer.full_name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{b.service_name}</div>
          </div>
        )
      })}
    </div>
  )
}

function WeekGrid({ days, hourStart, hourEnd, bookings, blocks, resources, onClickEmpty, onRemoveBlock }: {
  days: Date[]; hourStart: number; hourEnd: number; bookings: Booking[]; blocks: TimeBlock[]; resources: Resource[];
  onClickEmpty: (start: Date) => void;
  onRemoveBlock: (id: string) => void;
}) {
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div className="p-2" />
          {days.map(d => (
            <div key={d.toISOString()} className="border-l p-2 text-center">
              <div>{d.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
              <div className="text-base font-semibold text-foreground">{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-r">
            {hours.map(h => <div key={h} className="h-20 border-b px-2 py-1 text-[11px] text-muted-foreground">{String(h).padStart(2,'0')}:00</div>)}
          </div>
          {days.map(d => {
            const dayStart = new Date(d); dayStart.setHours(hourStart, 0, 0, 0)
            const dayEnd = new Date(d); dayEnd.setHours(hourEnd, 0, 0, 0)
            const totalMin = (dayEnd.getTime() - dayStart.getTime()) / 60000
            const dayB = bookings.filter(b => sameDay(new Date(b.starts_at), d))
            const dayBlk = blocks.filter(b => overlapsDay(new Date(b.starts_at), new Date(b.ends_at), d))

            function position(start: Date, end: Date) {
              const top = Math.max(0, ((start.getTime() - dayStart.getTime()) / 60000) / totalMin * 100)
              const height = Math.max(2, ((Math.min(end.getTime(), dayEnd.getTime()) - Math.max(start.getTime(), dayStart.getTime())) / 60000) / totalMin * 100)
              return { top: `${top}%`, height: `${height}%` }
            }
            function handleHourClick(hour: number, half: 0 | 30) {
              const x = new Date(dayStart); x.setHours(hour, half, 0, 0); onClickEmpty(x)
            }

            return (
              <div key={d.toISOString()} className="relative border-l" style={{ height: `${hours.length * 5}rem` }}>
                {hours.map(h => (
                  <div key={h} className="grid h-20 grid-rows-2 border-b">
                    <div className="cursor-pointer transition hover:bg-primary/5" onClick={() => handleHourClick(h, 0)} />
                    <div className="cursor-pointer border-t border-dashed border-border/40 transition hover:bg-primary/5" onClick={() => handleHourClick(h, 30)} />
                  </div>
                ))}
                {dayBlk.map(b => {
                  const start = new Date(b.starts_at); const end = new Date(b.ends_at); const pos = position(start, end)
                  return (
                    <div key={b.id} className="absolute left-1 right-1 flex flex-col rounded border border-dashed border-zinc-400/40 bg-zinc-200/40 px-1 py-0.5 text-[10px] text-zinc-600" style={pos}>
                      <div className="flex items-center justify-between"><span className="truncate font-medium">Bloqueo</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveBlock(b.id) }} className="text-zinc-500 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  )
                })}
                {dayB.map(b => {
                  const start = new Date(b.starts_at); const end = new Date(b.ends_at); const pos = position(start, end)
                  const r = resources.find(x => x.name === b.resource_name)
                  return (
                    <div key={b.id} className="absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded border bg-white px-1 py-0.5 text-[10px] shadow-sm" style={{ ...pos, borderLeft: `3px solid ${r?.color || 'hsl(var(--primary))'}` }}>
                      <div className="flex items-center gap-1 font-medium leading-none">{timeOfDay(b.starts_at)}<Badge variant="outline" className="ml-auto h-3.5 px-1 text-[8px] capitalize">{b.status}</Badge></div>
                      <div className="truncate">{b.customer.full_name}</div>
                      <div className="truncate text-[9px] text-muted-foreground">{b.service_name}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function useHourBounds(resources: Resource[], _days: Date[]) {
  return useMemo(() => {
    let earliest = 24
    let latest = 0
    for (const r of resources) {
      for (const rule of r.rules || []) {
        const startH = Number(String(rule.start_time).slice(0, 2))
        const endH = Number(String(rule.end_time).slice(0, 2))
        const endM = Number(String(rule.end_time).slice(3, 5))
        if (startH < earliest) earliest = startH
        if (endH + (endM > 0 ? 1 : 0) > latest) latest = endH + (endM > 0 ? 1 : 0)
      }
    }
    if (earliest === 24) earliest = 8
    if (latest === 0) latest = 20
    earliest = Math.max(0, earliest)
    latest = Math.min(24, latest)
    if (latest - earliest < 6) latest = Math.min(24, earliest + 6)
    return { hourStart: earliest, hourEnd: latest }
  }, [resources])
}

function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function overlapsDay(start: Date, end: Date, day: Date) {
  const s = new Date(day); s.setHours(0,0,0,0); const e = new Date(day); e.setHours(23,59,59,999)
  return start <= e && end >= s
}
function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
