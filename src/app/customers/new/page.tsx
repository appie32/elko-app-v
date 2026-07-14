'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { SOURCES } from '@/lib/constants'

export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    source: 'Instagram',
    general_note: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function save() {
    const { data, error } = await supabase.from('customers').insert(form).select().single()

    if (error) {
      alert(error.message)
      return
    }

    router.push(`/customers/${data.id}`)
  }

  return (
    <div className="card">
      <h1>Klant toevoegen</h1>
      <div className="grid grid-2">
        <label>Klantnaam <input value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} /></label>
        <label>Telefoon <input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
        <label>E-mail <input value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
        <label>Woonplaats <input value={form.city} onChange={(e) => update('city', e.target.value)} /></label>
        <label>Straat <input value={form.street} onChange={(e) => update('street', e.target.value)} /></label>
        <label>Huisnummer <input value={form.house_number} onChange={(e) => update('house_number', e.target.value)} /></label>
        <label>Postcode <input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} /></label>
        <label>Bron
          <select value={form.source} onChange={(e) => update('source', e.target.value)}>
            {SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
        </label>
      </div>

      <label style={{ marginTop: 16 }}>
        Algemene opmerking
        <textarea value={form.general_note} onChange={(e) => update('general_note', e.target.value)} />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={save}>Opslaan</button>
      </div>
    </div>
  )
}
