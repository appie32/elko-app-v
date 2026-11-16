'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/lib/types'

const statuses = [
  'Nieuwe aanvraag',
  'Inmeting gepland',
  'Ingemeten',
  'Offerte gemaakt',
  'Offerte verzonden',
  'Akkoord / opdracht',
  'Bestelling doorgezet',
  'Montage gepland',
  'Gemonteerd',
  'Afgerond',
  'Geannuleerd',
]
const sources = ['Instagram', 'Website', 'Werkspot', 'Via via', 'Bestaande klant', 'Facebook', 'Google', 'Marktplaats', 'Anders']

function addressOf(c: { street?: string | null; house_number?: string | null }) {
  return [c.street, c.house_number].filter(Boolean).join(' ')
}

export default function NewProjectPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersError, setCustomersError] = useState('')
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [differentAddress, setDifferentAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [createdCustomerId, setCreatedCustomerId] = useState('')
  const [customer, setCustomer] = useState({
    customer_name: '', phone: '', email: '', street: '', house_number: '',
    postal_code: '', city: '', source: 'Instagram', general_note: '',
  })
  const [project, setProject] = useState({
    customer_id: '', project_name: '', project_address: '', postal_code: '',
    city: '', status: 'Nieuwe aanvraag', internal_note: '', customer_note: '',
  })

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('customers').select('*').order('customer_name')
      if (error) {
        setCustomersError(`Klanten laden mislukt: ${error.message}`)
        return
      }
      setCustomers((data || []) as Customer[])
      setCustomersError('')
    }
    load()
  }, [])

  const selected = useMemo(
    () => customers.find((c) => c.id === project.customer_id),
    [customers, project.customer_id]
  )

  function updateProject(key: string, value: string) {
    setProject((previous) => ({ ...previous, [key]: value }))
    setMessage('')
  }

  function updateCustomer(key: string, value: string) {
    setCustomer((previous) => ({ ...previous, [key]: value }))
    setMessage('')
  }

  async function save() {
    if (saving) return
    setMessage('')

    // Check first so an expired session cannot silently hide or reject data.
    const { data: auth } = await supabase.auth.getSession()
    if (!auth.session) {
      setMessage('Je bent niet (meer) ingelogd. Log opnieuw in via /login en probeer het daarna opnieuw.')
      return
    }

    const currentCustomer = mode === 'existing' ? selected : customer
    if (!currentCustomer) {
      setMessage('Kies eerst een bestaande klant of maak een nieuwe klant aan.')
      return
    }
    if (mode === 'new' && !customer.customer_name.trim()) {
      setMessage('Vul de naam van de nieuwe klant in.')
      return
    }
    if (!currentCustomer.city?.trim() && !differentAddress) {
      setMessage('De woonplaats ontbreekt bij deze klant. Vul de woonplaats bij de klant in.')
      return
    }
    if (differentAddress && (!project.project_address.trim() || !project.city.trim())) {
      setMessage('Vul bij een afwijkend projectadres zowel het adres als de woonplaats in.')
      return
    }

    const projectCity = differentAddress ? project.city.trim() : currentCustomer.city.trim()
    const projectAddress = differentAddress ? project.project_address.trim() : addressOf(currentCustomer)
    const postalCode = differentAddress ? project.postal_code.trim() : (currentCustomer.postal_code || '').trim()
    if (!projectCity) {
      setMessage('Project kan niet worden opgeslagen zonder woonplaats.')
      return
    }

    setSaving(true)
    setMessage('Project wordt opgeslagen...')

    try {
      let customerId = mode === 'existing' ? project.customer_id : createdCustomerId
      if (mode === 'new' && !customerId) {
        const { data, error } = await supabase.from('customers').insert(customer).select('id').single()
        if (error) throw error
        customerId = data.id
        setCreatedCustomerId(customerId) // avoid duplicate customer if project insertion fails
      }
      const projectName = project.project_name.trim() || `Horren ${currentCustomer.customer_name}`
      const { data, error } = await supabase.from('projects').insert({
        customer_id: customerId,
        project_name: projectName,
        project_address: projectAddress || null,
        postal_code: postalCode || null,
        city: projectCity,
        status: project.status,
        internal_note: project.internal_note,
        customer_note: project.customer_note,
      }).select('id').single()
      if (error) throw error
      router.push(`/projects/${data.id}`)
    } catch (err: unknown) {
      setSaving(false)
      setMessage(err instanceof Error ? err.message : 'Opslaan mislukt. Probeer opnieuw.')
    }
  }

  return (
    <div className="card">
      <h1>Nieuw project</h1>
      <p className="muted">Gebruik het bestaande klantadres, of vink een afwijkend projectadres aan.</p>

      <div className="row" style={{ marginBottom: 18 }}>
        <button type="button" className={mode === 'existing' ? 'button' : 'button secondary'} onClick={() => { setMode('existing'); setDifferentAddress(false); setMessage('') }}>Bestaande klant</button>
        <button type="button" className={mode === 'new' ? 'button' : 'button secondary'} onClick={() => { setMode('new'); setDifferentAddress(false); setMessage('') }}>Nieuwe klant aanmaken</button>
      </div>

      {mode === 'existing' ? (
        <div className="card">
          <h2>Klant kiezen</h2>
          <label>Klant
            <select value={project.customer_id} onChange={(e) => updateProject('customer_id', e.target.value)}>
              <option value="">Selecteer een klant</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name} — {c.city}</option>)}
            </select>
          </label>
          {customersError && <p style={{ color: '#9c2424' }}>{customersError} <a href="/login">Opnieuw inloggen</a></p>}
          {!customersError && customers.length === 0 && <p className="muted">Geen klanten gevonden. Controleer of je bent ingelogd, of maak een nieuwe klant aan.</p>}
          {selected && <p className="muted">Adres: {addressOf(selected) || '-'}, {[selected.postal_code, selected.city].filter(Boolean).join(' ')}</p>}
        </div>
      ) : (
        <div className="card">
          <h2>Nieuwe klant</h2>
          {createdCustomerId && <p className="muted">Nieuwe klant is opgeslagen; het project kan veilig opnieuw worden geprobeerd.</p>}
          <div className="grid grid-2">
            <label>Naam <input value={customer.customer_name} onChange={(e) => updateCustomer('customer_name', e.target.value)} /></label>
            <label>Telefoon <input value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} /></label>
            <label>E-mail <input value={customer.email} onChange={(e) => updateCustomer('email', e.target.value)} /></label>
            <label>Straat <input value={customer.street} onChange={(e) => updateCustomer('street', e.target.value)} /></label>
            <label>Huisnummer <input value={customer.house_number} onChange={(e) => updateCustomer('house_number', e.target.value)} /></label>
            <label>Postcode <input value={customer.postal_code} onChange={(e) => updateCustomer('postal_code', e.target.value)} /></label>
            <label>Woonplaats <input value={customer.city} onChange={(e) => updateCustomer('city', e.target.value)} /></label>
            <label>Bron <select value={customer.source} onChange={(e) => updateCustomer('source', e.target.value)}>{sources.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
        </div>
      )}

      <h2>Projectgegevens</h2>
      <div className="grid grid-2">
        <label>Projectnaam <input value={project.project_name} onChange={(e) => updateProject('project_name', e.target.value)} placeholder="Bijv. Horren woning Leerdam" /></label>
        <label>Status <select value={project.status} onChange={(e) => updateProject('status', e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <input type="checkbox" checked={differentAddress} onChange={(e) => setDifferentAddress(e.target.checked)} style={{ width: 'auto' }} />
        Project is op een ander adres dan het klantadres
      </label>
      {differentAddress && <div className="grid grid-2" style={{ marginTop: 12 }}>
        <label>Projectadres <input value={project.project_address} onChange={(e) => updateProject('project_address', e.target.value)} /></label>
        <label>Postcode <input value={project.postal_code} onChange={(e) => updateProject('postal_code', e.target.value)} /></label>
        <label>Woonplaats <input value={project.city} onChange={(e) => updateProject('city', e.target.value)} /></label>
      </div>}
      <label style={{ marginTop: 16 }}>Interne opmerking<textarea value={project.internal_note} onChange={(e) => updateProject('internal_note', e.target.value)} /></label>
      <label style={{ marginTop: 16 }}>Klantopmerking<textarea value={project.customer_note} onChange={(e) => updateProject('customer_note', e.target.value)} /></label>
      {message && <p role="status" style={{ color: message.toLowerCase().includes('mislukt') || message.includes('ontbreekt') || message.includes('niet') ? '#9c2424' : '#4A3520' }}>{message}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={saving} onClick={save}>{saving ? 'Opslaan...' : 'Project opslaan'}</button>
      </div>
    </div>
  )
}
