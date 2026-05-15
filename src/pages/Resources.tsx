import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus, Trash2, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { dypai } from '@/lib/dypai'
import { firstRow, localeWeekdayLabel } from '@/lib/format'
import type { AvailabilityRule, Resource } from '@/lib/types'

const KINDS: { value: Resource['kind']; label: string }[] = [
  { value: 'staff', label: 'Personal' },
  { value: 'room', label: 'Sala' },
  { value: 'equipment', label: 'Equipamiento' },
]

const empty: Partial<Resource> & { rules: AvailabilityRule[] } = {
  name: '', slug: '', kind: 'staff', description: '', avatar_url: '', color: '#0ea5e9',
  capacity: 1, sort_order: 0, is_active: true, rules: [],
}

export function Resources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<typeof empty>(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await dypai.api.get('admin-list-resources')
    setResources(firstRow<{ resources: Resource[] }>(data)?.resources || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...empty, rules: [] }); setOpen(true) }
  function openEdit(r: Resource) { setForm({ ...r, rules: r.rules || [] } as any); setOpen(true) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name) { toast.error('Nombre requerido'); return }
    setSaving(true)
    const { error } = await dypai.api.post('admin-save-resource', form)
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo guardar'); return }
    toast.success('Recurso guardado')
    setOpen(false)
    await load()
  }

  function addRule() {
    setForm({ ...form, rules: [...(form.rules || []), { weekday: 1, start_time: '09:00', end_time: '14:00' }] })
  }

  function updateRule(idx: number, patch: Partial<AvailabilityRule>) {
    const rules = (form.rules || []).map((r, i) => (i === idx ? { ...r, ...patch } : r))
    setForm({ ...form, rules })
  }

  function removeRule(idx: number) {
    setForm({ ...form, rules: (form.rules || []).filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recursos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Personal, salas o equipamiento que pueden ser reservados</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo recurso</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : resources.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          <UsersRound className="mr-2 h-4 w-4" /> Aún no tienes recursos
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resources.map(r => (
            <Card key={r.id} className="cursor-pointer transition hover:border-primary/30" onClick={() => openEdit(r)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ background: r.color }}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
                    <div className="text-xs capitalize text-muted-foreground">{r.kind}</div>
                  </div>
                  {!r.is_active && <Badge variant="outline">Inactivo</Badge>}
                </div>
                {r.description && <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(r.rules || []).slice(0, 4).map(rule => (
                    <Badge key={(rule.id || '') + rule.weekday + rule.start_time} variant="outline" className="font-normal">
                      {localeWeekdayLabel(rule.weekday)} {String(rule.start_time).slice(0, 5)}–{String(rule.end_time).slice(0, 5)}
                    </Badge>
                  ))}
                  {(r.rules || []).length > 4 && <Badge variant="outline">+{(r.rules || []).length - 4}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar recurso' : 'Nuevo recurso'}</DialogTitle>
            <DialogDescription>Define disponibilidad semanal</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nombre" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Slug" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <Textarea placeholder="Descripción" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="grid gap-3 sm:grid-cols-4">
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Resource['kind'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Color (#hex)" value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <Input type="number" min={1} value={form.capacity ?? 1} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="Capacidad" />
              <label className="flex items-center justify-between rounded-md border p-2 text-sm">
                Activo
                <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </label>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Disponibilidad semanal</p>
                <Button type="button" size="sm" variant="outline" onClick={addRule}><Plus className="h-3 w-3" /> Añadir franja</Button>
              </div>
              {(form.rules || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Sin franjas configuradas — el recurso no será reservable hasta añadir alguna.</p>
              )}
              {(form.rules || []).map((rule, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <Select value={String(rule.weekday)} onValueChange={(v) => updateRule(idx, { weekday: Number(v) })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,0].map(d => <SelectItem key={d} value={String(d)}>{localeWeekdayLabel(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="time" value={String(rule.start_time).slice(0, 5)} onChange={(e) => updateRule(idx, { start_time: e.target.value })} className="h-9" />
                  <Input type="time" value={String(rule.end_time).slice(0, 5)} onChange={(e) => updateRule(idx, { end_time: e.target.value })} className="h-9" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>

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
