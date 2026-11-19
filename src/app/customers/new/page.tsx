'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { SOURCES } from '@/lib/constants'

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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

  async function save(createProject: boolean) {
    if (saving) return
    setErrorMessage('')
    if (!form.customer_name.trim() || !form.city.trim()) {
      setErrorMessage('Vul minimaal een klantnaam en woonplaats in.'); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert({
      ...form, customer_name: form.customer_name.trim(), city: form.city.trim(),
      postal_code: form.postal_code.trim().toUpperCase(),
    }).select('id').single()
    setSaving(false)
    if (error || !data) { setErrorMessage(error?.message || 'Klant niet opgeslagen.'); return }
    router.push(createProject ? `/projects/new?customer=${data.id}` : `/customers/${data.id}`)
  }

  return (
    <div className="card">
      <h1>Klant toevoegen</h1>
      <p className="muted">Je kunt na het opslaan direct een project en inmeetafspraak voorbereiden.</p>
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

      {errorMessage && <p role="alert" style={{color:'#9c2424'}}>{errorMessage}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={saving} onClick={() => save(true)}>{saving?'Opslaan...':'Klant opslaan en project maken'}</button>
        <button className="button secondary" disabled={saving} onClick={() => save(false)}>Alleen klant opslaan</button>
      </div>
    </div>
  )
}
