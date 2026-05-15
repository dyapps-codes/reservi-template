import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dypai } from '@/lib/dypai'
import { firstRow, fullDate, toIsoDate } from '@/lib/format'
import type { Resource, Service, Slot } from '@/lib/types'

export type CreateBookingPrefill = {
  serviceId?: string
  resourceId?: string
  date?: string
  starts_at?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  services: Service[]
  resources: Resource[]
  prefill?: CreateBookingPrefill
  onCreated: () => void
}

export function CreateBookingDialog({ open, onOpenChange, services, resources, prefill, onCreated }: Props) {
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [serviceId, setServiceId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [date, setDate] = useState(toIsoDate(new Date()))
  const [slots, setSlots] = useState<Slot[]>([])
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep('pick')
    setServiceId(prefill?.serviceId || '')
    setResourceId(prefill?.resourceId || '')
    setDate(prefill?.date || toIsoDate(new Date()))
    setPickedSlot(null)
    setForm({ customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  }, [open, prefill?.serviceId, prefill?.resourceId, prefill?.date])

  useEffect(() => {
    if (!serviceId) { setSlots([]); return }
    setLoadingSlots(true)
    dypai.api.get('get-availability', {
      params: { service_id: serviceId, date, resource_id: resourceId || undefined },
    }).then(({ data }) => {
      const row = firstRow<{ slots: Slot[] }>(data)
      const list = row?.slots || []
      setSlots(list)
      if (prefill?.starts_at) {
        const exact = list.find(s => s.starts_at.startsWith(prefill.starts_at!.slice(0, 16)))
        if (exact) { setPickedSlot(exact); setStep('form') }
      }
      setLoadingSlots(false)
    })
  }, [serviceId, resourceId, date])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pickedSlot || !serviceId) return
    setSaving(true)
    const { error } = await dypai.api.post('admin-create-booking', {
      service_id: serviceId,
      resource_id: pickedSlot.resource_id || undefined,
      starts_at: pickedSlot.starts_at,
      ...form,
    })
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo crear'); return }
    toast.success('Reserva creada')
    onOpenChange(false)
    onCreated()
  }

  const filteredResources = resources.filter(r => services.find(s => s.id === serviceId)?.resources?.some(sr => sr.id === r.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
          <DialogDescription>{step === 'pick' ? 'Elige servicio y franja' : 'Datos del cliente'}</DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Servicio" /></SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={resourceId || 'any'} onValueChange={(v) => setResourceId(v === 'any' ? '' : v)} disabled={!serviceId}>
                <SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera disponible</SelectItem>
                  {filteredResources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              {loadingSlots ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !serviceId ? (
                <p className="text-center text-sm text-muted-foreground">Selecciona un servicio</p>
              ) : slots.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Sin huecos para esa fecha</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {slots.map(s => (
                    <button
                      key={s.starts_at + (s.resource_id || '')}
                      type="button"
                      onClick={() => { setPickedSlot(s); setStep('form') }}
                      className="rounded-md border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary hover:bg-primary/5"
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

        {step === 'form' && pickedSlot && (
          <form onSubmit={submit} className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <span className="font-medium">{services.find(s => s.id === serviceId)?.name}</span> · {fullDate(pickedSlot.starts_at)}{pickedSlot.resource_name ? ` · ${pickedSlot.resource_name}` : ''}
            </div>
            <Input placeholder="Nombre del cliente" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            <Input type="email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required />
            <Input placeholder="Teléfono" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            <Textarea placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('pick')}>Volver</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Crear reserva</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
