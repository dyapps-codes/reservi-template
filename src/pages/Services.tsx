import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { dypai } from '@/lib/dypai'
import { firstRow, formatMoney, formatDuration } from '@/lib/format'
import type { Resource, Service } from '@/lib/types'

const empty: Partial<Service> & { resource_ids?: string[] } = {
  name: '', slug: '', description: '', duration_minutes: 30, buffer_minutes: 0, price_cents: 0,
  currency: 'EUR', color: '#0ea5e9', capacity: 1, requires_resource: true, is_public: true, is_active: true,
  sort_order: 0, resource_ids: [],
}

export function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<typeof empty>(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [s, r] = await Promise.all([
      dypai.api.get('admin-list-services'),
      dypai.api.get('admin-list-resources'),
    ])
    setServices(firstRow<{ services: Service[] }>(s.data)?.services || [])
    setResources(firstRow<{ resources: Resource[] }>(r.data)?.resources || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...empty }); setOpen(true) }
  function openEdit(s: Service) {
    setForm({ ...s, resource_ids: (s.resources || []).map(r => r.id) } as any)
    setOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name) { toast.error('Nombre requerido'); return }
    setSaving(true)
    const { error } = await dypai.api.post('admin-save-service', form)
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo guardar'); return }
    toast.success('Servicio guardado')
    setOpen(false)
    await load()
  }

  function toggleResource(id: string) {
    const ids = form.resource_ids || []
    setForm({ ...form, resource_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lo que tus clientes pueden reservar</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo servicio</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : services.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          <Sparkles className="mr-2 h-4 w-4" /> Aún no tienes servicios
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="cursor-pointer transition hover:border-primary/30" onClick={() => openEdit(s)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="truncate text-sm font-semibold">{s.name}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description || '—'}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="text-base font-semibold text-foreground">{formatMoney(s.price_cents, s.currency)}</div>
                    <div>{formatDuration(s.duration_minutes)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!s.is_active && <Badge variant="outline">Inactivo</Badge>}
                  {!s.is_public && <Badge variant="outline">Privado</Badge>}
                  {s.requires_resource && (s.resources || []).map(r => (
                    <Badge key={r.id} variant="outline" className="font-normal">
                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: r.color || '#999' }} />
                      {r.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
            <DialogDescription>Duración, precio y recursos asignados</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nombre" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Slug (opcional)" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <Textarea placeholder="Descripción" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="grid gap-3 sm:grid-cols-4">
              <NumberField label="Duración (min)" value={form.duration_minutes} onChange={(v) => setForm({ ...form, duration_minutes: v })} />
              <NumberField label="Buffer (min)" value={form.buffer_minutes} onChange={(v) => setForm({ ...form, buffer_minutes: v })} />
              <NumberField label="Precio (céntimos)" value={form.price_cents} onChange={(v) => setForm({ ...form, price_cents: v })} />
              <NumberField label="Capacidad" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Color (#0ea5e9)" value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <Input placeholder="Currency" value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <NumberField label="Orden" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ToggleRow label="Requiere recurso" value={!!form.requires_resource} onChange={(v) => setForm({ ...form, requires_resource: v })} />
              <ToggleRow label="Público" value={!!form.is_public} onChange={(v) => setForm({ ...form, is_public: v })} />
              <ToggleRow label="Activo" value={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            {form.requires_resource && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recursos asignados</p>
                <div className="flex flex-wrap gap-2">
                  {resources.filter(r => r.is_active).map(r => {
                    const selected = (form.resource_ids || []).includes(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleResource(r.id)}
                        className={'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ' + (selected ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                        {r.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {form.id ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="number" min={0} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-md border p-3 text-sm">
      {label}
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  )
}
