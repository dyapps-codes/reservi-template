import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { dypai } from '@/lib/dypai'
import { firstRow } from '@/lib/format'
import type { Settings as SettingsT } from '@/lib/types'

const STEP_OPTIONS = [5, 10, 15, 20, 30, 60]

export function Settings() {
  const [form, setForm] = useState<Partial<SettingsT>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dypai.api.get('admin-get-settings').then(({ data }) => {
      const row = firstRow<{ settings: SettingsT }>(data)
      if (row?.settings) setForm(row.settings)
      setLoading(false)
    })
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const { error } = await dypai.api.post('admin-save-settings', form)
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo guardar'); return }
    toast.success('Configuración guardada')
  }

  if (loading) return <div className="flex h-60 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-end justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
          <p className="mt-1 text-sm text-muted-foreground">Marca, ventana de reservas y preferencias</p>
        </div>
        <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Negocio</CardTitle><CardDescription>Cómo aparece tu marca</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nombre del negocio" value={form.business_name || ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            <Input placeholder="Color de marca" value={form.brand_color || ''} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
          </div>
          <Textarea placeholder="Tagline" value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} rows={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="email" placeholder="Email de contacto" value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            <Input placeholder="Teléfono de contacto" value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <Input placeholder="URL de imagen hero (opcional)" value={form.hero_image_url || ''} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Localización</CardTitle><CardDescription>Idioma, zona horaria y moneda</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Timezone (Europe/Madrid)" value={form.timezone || ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          <Input placeholder="Locale (es-ES)" value={form.locale || ''} onChange={(e) => setForm({ ...form, locale: e.target.value })} />
          <Input placeholder="Currency (EUR)" value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Política de reservas</CardTitle><CardDescription>Anticipación, ventana y confirmación</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldNumber label="Ventana (días)" value={form.booking_window_days} onChange={(v) => setForm({ ...form, booking_window_days: v })} min={1} />
            <FieldNumber label="Antelación mínima (min)" value={form.min_lead_minutes} onChange={(v) => setForm({ ...form, min_lead_minutes: v })} min={0} />
            <FieldNumber label="Cancelación mínima (min)" value={form.cancellation_lead_minutes} onChange={(v) => setForm({ ...form, cancellation_lead_minutes: v })} min={0} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Granularidad de slots</label>
              <Select value={String(form.slot_step_minutes ?? 15)} onValueChange={(v) => setForm({ ...form, slot_step_minutes: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                Auto-confirmar reservas
                <Switch checked={!!form.auto_confirm} onCheckedChange={(v) => setForm({ ...form, auto_confirm: v })} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                Notificaciones activas
                <Switch checked={!!form.notifications_enabled} onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function FieldNumber({ label, value, onChange, min }: { label: string; value?: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="number" min={min} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}
