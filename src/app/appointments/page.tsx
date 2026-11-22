'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Appointment } from '@/lib/types'
import { downloadIcs } from '@/lib/calendar'

type Contact = { id: string; customer_name: string; email?: string | null; phone?: string | null }

function dateForCustomer(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('nl-NL', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Amsterdam',
  })
}
function appointmentMessage(a: Appointment, contact?: Contact): string {
  const name = contact?.customer_name?.trim() || 'heer/mevrouw'
  return `Beste ${name},\n\nHierbij bevestigen wij onze afspraak voor ${a.appointment_type.toLowerCase()} op ${dateForCustomer(a.starts_at)}.\n\nAdres: ${a.location || 'zoals besproken'}\n\nMocht het tijdstip niet uitkomen, laat het ons dan tijdig weten.\n\nMet vriendelijke groet,\nELKO Solutions\nMaatwerk zonder concessies.`
}
function whatsappNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `31${digits.slice(1)}`
  return digits
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const { data, error: appointmentError } = await supabase.from('appointments')
        .select('*').order('starts_at', { ascending: true })
      if (!alive) return
      if (appointmentError) {
        setError(appointmentError.message); setLoading(false); return
      }
      const rows = (data || []) as Appointment[]
      setAppointments(rows)
      const ids = [...new Set(rows.map(a => a.customer_id).filter((id): id is string => !!id))]
      if (ids.length) {
        const { data: customers } = await supabase.from('customers')
          .select('id,customer_name,email,phone').in('id', ids)
        if (alive) setContacts(Object.fromEntries(((customers || []) as Contact[]).map(c => [c.id, c])))
      }
      if (alive) setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  function openEmail(a: Appointment, c?: Contact) {
    if (!c?.email) return
    const subject = `Afspraakbevestiging ELKO Solutions - ${a.appointment_type}`
    const url = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(appointmentMessage(a, c))}`
    window.location.href = url
  }
  function openWhatsApp(a: Appointment, c?: Contact) {
    if (!c?.phone) return
    const number = whatsappNumber(c.phone)
    if (!number) return
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(appointmentMessage(a, c))}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="card">
      <h1>Planning</h1>
      <p className="muted">Klik op een afspraak om het bijbehorende project te openen. Verstuur een bevestiging met je eigen e-mail- of WhatsApp-app; niets wordt automatisch verzonden.</p>
      {loading && <p className="muted">Afspraken laden...</p>}
      {error && <p role="alert" style={{ color:'#9b2525' }}>Planning laden mislukt: {error}</p>}
      <div style={{ overflowX:'auto' }}>
        <table className="table">
          <thead><tr><th>Datum/tijd</th><th>Afspraak / project</th><th>Locatie</th><th>Status</th><th>Acties</th></tr></thead>
          <tbody>
            {appointments.map(a => {
              const c = a.customer_id ? contacts[a.customer_id] : undefined
              return <tr key={a.id}>
                <td>{dateForCustomer(a.starts_at)}</td>
                <td><strong>{a.appointment_type}</strong><br/>
                  {a.project_id ? <Link href={`/projects/${a.project_id}`}>{a.title} — open project</Link> : a.title}
                  {c && <div className="muted">{c.customer_name}</div>}
                </td>
                <td>{a.location || '-'}</td><td>{a.status}</td>
                <td>
                  <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                    <button type="button" className="button secondary" onClick={()=>downloadIcs(a)}>Agenda-export</button>
                    {c?.email && <button type="button" className="button secondary" onClick={()=>openEmail(a,c)}>E-mail voorbereiden</button>}
                    {c?.phone && <button type="button" className="button secondary" onClick={()=>openWhatsApp(a,c)}>WhatsApp voorbereiden</button>}
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {!loading && !appointments.length && !error && <p className="muted">Er zijn nog geen afspraken ingepland.</p>}
      <p className="muted">Agenda-export maakt een .ics-bestand voor Apple Agenda of Outlook. Dit is eenmalig importeren, nog geen automatische synchronisatie. Automatische herinneringen en echt verzenden via ELKO-mail volgen na de officiële koppeling.</p>
      <Link className="button secondary" href="/dashboard">Terug naar dashboard</Link>
    </div>
  )
}
