'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { PROJECT_STATUSES } from '@/lib/constants'
import type { Customer } from '@/lib/types'

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerIdFromUrl = searchParams.get('customer_id') || ''
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({
    customer_id: customerIdFromUrl,
    project_name: '',
    project_address: '',
    postal_code: '',
    city: '',
    request_date: '',
    measurement_date: '',
    status: 'Nieuwe aanvraag',
    internal_note: '',
    customer_note: '',
  })

  useEffect(() => {
    async function loadCustomers() {
      const { data } = await supabase.from('customers').select('*').order('customer_name')
      setCustomers((data || []) as Customer[])
    }
    loadCustomers()
  }, [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function save() {
    const payload = {
      ...form,
      request_date: form.request_date || null,
      measurement_date: form.measurement_date || null,
    }

    const { data, error } = await supabase.from('projects').insert(payload).select().single()

    if (error) {
      alert(error.message)
      return
    }

    router.push(`/projects/${data.id}`)
  }

  return (
    <div className="card">
      <h1>Project aanmaken</h1>
      <div className="grid grid-2">
        <label>Klant
          <select value={form.customer_id} onChange={(e) => update('customer_id', e.target.value)}>
            <option value="">Kies klant</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.customer_name} — {customer.city}</option>
            ))}
          </select>
        </label>
        <label>Projectnaam <input value={form.project_name} onChange={(e) => update('project_name', e.target.value)} /></label>
        <label>Projectadres <input value={form.project_address} onChange={(e) => update('project_address', e.target.value)} /></label>
        <label>Postcode <input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} /></label>
        <label>Woonplaats <input value={form.city} onChange={(e) => update('city', e.target.value)} /></label>
        <label>Status
          <select value={form.status} onChange={(e) => update('status', e.target.value)}>
            {PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
      </div>

      <label style={{ marginTop: 16 }}>Interne opmerking
        <textarea value={form.internal_note} onChange={(e) => update('internal_note', e.target.value)} />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={save}>Project opslaan</button>
      </div>
    </div>
  )
}
