import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, MailIcon, Phone, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { dypai } from '@/lib/dypai'
import { firstRow } from '@/lib/format'
import type { Customer } from '@/lib/types'

const empty: Partial<Customer> = { email: '', full_name: '', phone: '', notes: '', marketing_opt_in: false }

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Partial<Customer>>(empty)
  const [saving, setSaving] = useState(false)

  async function load(search?: string) {
    setLoading(true)
    const { data, error } = await dypai.api.get('admin-list-customers', { params: { search: search || '', limit: 200 } })
    if (error) { toast.error(error.message ?? 'No se pudo cargar'); setLoading(false); return }
    const row = firstRow<{ customers: Customer[] }>(data)
    setCustomers(row?.customers || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c => (c.full_name + ' ' + c.email + ' ' + (c.phone || '')).toLowerCase().includes(q))
  }, [customers, query])

  function openCreate() {
    setForm(empty)
    setDialogOpen(true)
  }

  function openEdit(customer: Customer) {
    setForm(customer)
    setDialogOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.email || !form.full_name) {
      toast.error('Email y nombre son obligatorios')
      return
    }
    setSaving(true)
    const { error } = await dypai.api.post('admin-save-customer', form)
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo guardar'); return }
    toast.success('Cliente guardado')
    setDialogOpen(false)
    await load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lista de clientes con histórico de reservas</p>
        </div>
        <Button onClick={openCreate} size="sm"><UserPlus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, email o teléfono" className="h-10 pl-9" />
        </div>
        <div className="text-sm text-muted-foreground">{filtered.length} de {customers.length}</div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">Sin clientes todavía</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="group transition hover:border-primary/30">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/customers/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {c.full_name}
                      <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MailIcon className="h-3 w-3" /> {c.email}
                    </div>
                    {c.phone && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                  </Link>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="text-base font-semibold text-foreground">{c.bookings_count}</div>
                    <div>reservas</div>
                  </div>
                </div>
                {c.last_booking_at && (
                  <div className="text-xs text-muted-foreground">Última: {new Date(c.last_booking_at).toLocaleDateString()}</div>
                )}
                <div className="flex items-center justify-between pt-1">
                  {c.notes ? <p className="line-clamp-1 flex-1 text-xs text-muted-foreground">{c.notes}</p> : <span />}
                  <button type="button" onClick={() => openEdit(c)} className="text-xs text-primary opacity-60 hover:opacity-100">Editar</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>Datos de contacto y preferencias</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nombre completo" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <Input type="email" placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Input placeholder="Teléfono" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Textarea placeholder="Notas internas" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              Marketing opt-in
              <Switch checked={!!form.marketing_opt_in} onCheckedChange={(v) => setForm({ ...form, marketing_opt_in: v })} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{form.id ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
