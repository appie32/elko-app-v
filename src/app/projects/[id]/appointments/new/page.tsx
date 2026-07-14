'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/lib/constants'
import type { Project } from '@/lib/types'

export default function NewAppointmentPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)

  const [form, setForm] = useState({
    title: '',
    appointment_type: 'Inmeting',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    status: 'Gepland',
  })

  useEffect(() => {
    async function loadProject() {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
      setProject(data as Project)
      if (data) {
        setForm((prev) => ({
          ...prev,
          title: `${prev.appointment_type} - ${data.project_name}`,
          location: data.project_address || data.city || '',
        }))
      }
    }

    loadProject()
  }, [projectId])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function save() {
    if (!project) return
    if (!form.date || !form.start_time || !form.end_time) {
      alert('Vul datum, starttijd en eindtijd in.')
      return
    }

    const startsAt = new Date(`${form.date}T${form.start_time}:00`).toISOString()
    const endsAt = new Date(`${form.date}T${form.end_time}:00`).toISOString()

    const { error } = await supabase.from('appointments').insert({
      project_id: projectId,
      customer_id: project.customer_id,
      title: form.title,
      appointment_type: form.appointment_type,
      starts_at: startsAt,
      ends_at: endsAt,
      location: form.location,
      notes: form.notes,
      status: form.status,
    })

    if (error) {
      alert(error.message)
      return
    }

    router.push('/appointments')
  }

  return (
    <div className="card">
      <h1>Afspraak toevoegen</h1>
      <p className="muted">{project?.project_name}</p>

      <div className="grid grid-2">
        <label>Type
          <select value={form.appointment_type} onChange={(e) => update('appointment_type', e.target.value)}>
            {APPOINTMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>Status
          <select value={form.status} onChange={(e) => update('status', e.target.value)}>
            {APPOINTMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>Titel <input value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label>Locatie <input value={form.location} onChange={(e) => update('location', e.target.value)} /></label>
        <label>Datum <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label>
        <label>Starttijd <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} /></label>
        <label>Eindtijd <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} /></label>
      </div>

      <label style={{ marginTop: 16 }}>Notitie
        <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={save}>Afspraak opslaan</button>
      </div>
    </div>
  )
}
