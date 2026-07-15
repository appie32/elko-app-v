'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/lib/types'

const PROJECT_STATUSES = [
  'Nieuwe aanvraag',
  'Inmeting gepland',
  'Ingemeten',
  'Offerte gemaakt',
  'Offerte verzonden',
  'Akkoord klant',
  'Bestelling doorgezet',
  'Montage gepland',
  'Gemonteerd',
  'Afgerond',
  'Geannuleerd',
]

const SOURCES = [
  'Instagram',
  'Website',
  'Werkspot',
  'Via via',
  'Bestaande klant',
  'Facebook',
  'Google',
  'Marktplaats',
  'Anders',
]

export default function NewProjectPage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [newCustomer, setNewCustomer] = useState({
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

  const [form, setForm] = useState({
    customer_id: '',
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

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('customer_name')

    setCustomers((data || []) as Customer[])
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage('')
  }

  function updateCustomer(field: string, value: string) {
    setNewCustomer((prev) => ({ ...prev, [field]: value }))
    setMessage('')
  }

  async function createCustomerIfNeeded() {
    if (customerMode === 'existing') {
      if (!form.customer_id) {
        throw new Error('Kies een klant of maak direct een nieuwe klant aan.')
      }

      return form.customer_id
    }

    if (!newCustomer.customer_name.trim()) {
      throw new Error('Vul de klantnaam in.')
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomer)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data.id
  }

  async function save() {
    if (saving) return

    setSaving(true)
    setMessage('Opslaan...')

    try {
      const customerId = await createCustomerIfNeeded()

      const payload = {
        customer_id: customerId,
        project_name: form.project_name || `Project ${newCustomer.customer_name}`,
        project_address: form.project_address || newCustomer.street || null,
        postal_code: form.postal_code || newCustomer.postal_code || null,
        city: form.city || newCustomer.city || null,
        request_date: form.request_date || null,
        measurement_date: form.measurement_date || null,
        status: form.status,
        internal_note: form.internal_note,
        customer_note: form.customer_note,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single()

      if (error) {
        throw error
      }

      router.push(`/projects/${data.id}`)
    } catch (error: any) {
      setMessage(error.message)
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h1>Project aanmaken</h1>

      <div className="row" style={{ marginBottom: 18 }}>
        <button
          className={customerMode === 'existing' ? 'button' : 'button secondary'}
          onClick={() => setCustomerMode('existing')}
        >
          Bestaande klant
        </button>

        <button
          className={customerMode === 'new' ? 'button' : 'button secondary'}
          onClick={() => setCustomerMode('new')}
        >
          Nieuwe klant direct aanmaken
        </button>
      </div>

      {customerMode === 'existing' ? (
        <div className="grid grid-2">
          <label>
            Klant
            <select
              value={form.customer_id}
              onChange={(e) => update('customer_id', e.target.value)}
            >
              <option value="">Kies klant</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} — {customer.city}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="card">
          <h2>Nieuwe klant</h2>

          <div className="grid grid-2">
            <label>
              Klantnaam
              <input
                value={newCustomer.customer_name}
                onChange={(e) => updateCustomer('customer_name', e.target.value)}
                placeholder="Naam klant"
              />
            </label>

            <label>
              Telefoon
              <input
                value={newCustomer.phone}
                onChange={(e) => updateCustomer('phone', e.target.value)}
                placeholder="06..."
              />
            </label>

            <label>
              E-mail
              <input
                value={newCustomer.email}
                onChange={(e) => updateCustomer('email', e.target.value)}
                placeholder="naam@email.nl"
              />
            </label>

            <label>
              Straat
              <input
                value={newCustomer.street}
                onChange={(e) => updateCustomer('street', e.target.value)}
              />
            </label>

            <label>
              Huisnummer
              <input
                value={newCustomer.house_number}
                onChange={(e) => updateCustomer('house_number', e.target.value)}
              />
            </label>

            <label>
              Postcode
              <input
                value={newCustomer.postal_code}
                onChange={(e) => updateCustomer('postal_code', e.target.value)}
              />
            </label>

            <label>
              Woonplaats
              <input
                value={newCustomer.city}
                onChange={(e) => updateCustomer('city', e.target.value)}
              />
            </label>

            <label>
              Bron
              <select
                value={newCustomer.source}
                onChange={(e) => updateCustomer('source', e.target.value)}
              >
                {SOURCES.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <h2>Projectgegevens</h2>

      <div className="grid grid-2">
        <label>
          Projectnaam
          <input
            value={form.project_name}
            onChange={(e) => update('project_name', e.target.value)}
            placeholder="Bijv. Horren woning Utrecht"
          />
        </label>

        <label>
          Projectadres
          <input
            value={form.project_address}
            onChange={(e) => update('project_address', e.target.value)}
            placeholder="Laat leeg als gelijk aan klantadres"
          />
        </label>

        <label>
          Postcode
          <input
            value={form.postal_code}
            onChange={(e) => update('postal_code', e.target.value)}
            placeholder="Laat leeg als gelijk aan klantadres"
          />
        </label>

        <label>
          Woonplaats
          <input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Laat leeg als gelijk aan klantadres"
          />
        </label>

        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ marginTop: 16 }}>
        Interne opmerking
        <textarea
          value={form.internal_note}
          onChange={(e) => update('internal_note', e.target.value)}
          placeholder="Niet zichtbaar voor klant"
        />
      </label>

      <label style={{ marginTop: 16 }}>
        Klantopmerking
        <textarea
          value={form.customer_note}
          onChange={(e) => update('customer_note', e.target.value)}
          placeholder="Eventuele klantgerichte notitie"
        />
      </label>

      {message && <p className="muted">{message}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={saving} onClick={save}>
          {saving ? 'Opslaan...' : 'Project opslaan'}
        </button>
      </div>
    </div>
  )
}
