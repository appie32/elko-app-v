'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Appointment } from '@/lib/types'
import { downloadIcs } from '@/lib/calendar'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .order('starts_at', { ascending: true })

      setAppointments((data || []) as Appointment[])
    }

    load()
  }, [])

  return (
    <div className="card">
      <h1>Planning</h1>
      <p className="muted">Interne afspraken. Via .ics kun je een afspraak toevoegen aan Apple Agenda of Outlook.</p>

      <table className="table">
        <thead>
          <tr>
            <th>Datum/tijd</th>
            <th>Type</th>
            <th>Titel</th>
            <th>Locatie</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td>{new Date(appointment.starts_at).toLocaleString('nl-NL')}</td>
              <td>{appointment.appointment_type}</td>
              <td>{appointment.title}</td>
              <td>{appointment.location || '-'}</td>
              <td>{appointment.status}</td>
              <td>
                <button className="button secondary" onClick={() => downloadIcs(appointment)}>
                  Agenda-export
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        Nieuwe afspraak maak je voorlopig vanuit een projectdetail.
      </p>
      <Link className="button secondary" href="/dashboard">Terug naar dashboard</Link>
    </div>
  )
}
