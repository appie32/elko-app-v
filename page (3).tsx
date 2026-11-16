'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/quote'
import type { Customer, ProductLine, Project } from '@/lib/types'

const statuses = [
  'Nieuwe aanvraag', 'Inmeting gepland', 'Ingemeten',
  'Offerte gemaakt', 'Offerte verzonden', 'Akkoord / opdracht',
  'Bestelling doorgezet', 'Montage gepland', 'Gemonteerd',
  'Afgerond', 'Geannuleerd',
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<ProductLine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data: item, error } = await supabase.from('projects').select('*').eq('id', id).single()
    setLoading(false)
    if (error || !item) {
      setLoadError(error?.message || 'Project niet gevonden')
      return
    }
    setProject(item as Project)
    setSelectedStatus(item.status)
    const [customerResult, linesResult] = await Promise.all([
      supabase.from('customers').select('*').eq('id', item.customer_id).single(),
      supabase.from('product_lines').select('*').eq('project_id', id).order('sort_order'),
    ])
    setCustomer((customerResult.data || null) as Customer | null)
    setLines((linesResult.data || []) as ProductLine[])
  }

  useEffect(() => { load() }, [id])
  const total = useMemo(() => lines.reduce((sum, line) =>
    sum + Number(line.quantity || 1) * Number(line.manual_price || 0), 0), [lines])

  async function saveStatus() {
    if (!project || saving || selectedStatus === project.status) return
    setSaving(true)
    setMessage('Status opslaan...')
    const { error } = await supabase.from('projects').update({ status: selectedStatus }).eq('id', project.id)
    if (error) {
      setMessage(`Status aanpassen mislukt: ${error.message}`)
    } else {
      setProject({ ...project, status: selectedStatus })
      setMessage('Projectstatus bijgewerkt.')
    }
    setSaving(false)
  }

  async function duplicateLine(line: ProductLine, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    const copy: any = { ...line }
    delete copy.id
    delete copy.created_at
    delete copy.updated_at
    delete copy.subtotal
    copy.room = `${line.room || 'Ruimte'} kopie`
    copy.sort_order = lines.length + 1
    const { error } = await supabase.from('product_lines').insert(copy)
    if (error) { alert(error.message); return }
    await load()
  }

  async function deleteLine(line: ProductLine, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (!confirm(`Productregel verwijderen: ${line.product_type} - ${line.room || 'zonder ruimte'}?`)) return
    const { error } = await supabase.from('product_lines').delete().eq('id', line.id)
    if (error) { alert(error.message); return }
    await load()
  }

  if (loading) return <div className="card">Project laden...</div>
  if (loadError) return <div className="card" role="alert">Project laden mislukt: {loadError}. <Link href="/login">Opnieuw inloggen</Link></div>
  if (!project) return <div className="card">Project niet gevonden.</div>

  return (
    <>
      <div className="card">
        <h1>{project.project_name}</h1>
        <p className="muted">{customer?.customer_name || 'Klant'} · {project.city} · {project.status}</p>
        <div className="grid grid-2" style={{ marginTop: 18, marginBottom: 18 }}>
          <label>Projectstatus
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setMessage('') }}>
              {!statuses.includes(selectedStatus) && <option value={selectedStatus}>{selectedStatus}</option>}
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button disabled={saving || selectedStatus === project.status} onClick={saveStatus}>
              {saving ? 'Opslaan...' : 'Status opslaan'}
            </button>
          </div>
        </div>
        {message && <p className="muted" role="status">{message}</p>}
        <div className="row">
          <Link className="button" href={`/projects/${project.id}/product-lines/new`}>Productregel toevoegen</Link>
          <Link className="button secondary" href={`/projects/${project.id}/quote`}>Offerte maken</Link>
          <Link className="button secondary" href={`/projects/${project.id}/photos`}>Foto&apos;s</Link>
          <Link className="button secondary" href={`/projects/${project.id}/appointments/new`}>Afspraak toevoegen</Link>
          <Link className="button secondary" href="/projects">Alle projecten</Link>
        </div>
      </div>
      <div className="card">
        <h2>Productregels</h2>
        <p className="muted">Klik op een regel om hem aan te passen, of gebruik de knoppen rechts.</p>
        {lines.length === 0 ? <p>Nog geen productregels toegevoegd.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Ruimte</th><th>Product</th><th>Maat</th><th>Aantal</th><th>Bedrag</th><th>Acties</th></tr></thead>
              <tbody>{lines.map((line) => (
                <tr
                  key={line.id}
                  role="link" tabIndex={0} style={{ cursor: 'pointer' }}
                  title="Klik om productregel aan te passen"
                  onClick={() => router.push(`/projects/${project.id}/product-lines/${line.id}/edit`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      router.push(`/projects/${project.id}/product-lines/${line.id}/edit`)
                    }
                  }}
                >
                  <td>{line.room || '-'}</td><td>{line.product_type}</td>
                  <td>{line.width_mm && line.height_mm ? `${line.width_mm} x ${line.height_mm}` : '-'}</td>
                  <td>{line.quantity}</td>
                  <td>{formatEuro(Number(line.quantity || 1) * Number(line.manual_price || 0))}</td>
                  <td><div className="row">
                    <Link href={`/projects/${project.id}/product-lines/${line.id}/edit`} onClick={(event) => event.stopPropagation()}>Aanpassen</Link>
                    <button className="button secondary" onClick={(event) => duplicateLine(line, event)}>Kopiëren</button>
                    <button className="button secondary" onClick={(event) => deleteLine(line, event)}>Verwijderen</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <h2>Totaal: {formatEuro(total)}</h2>
      </div>
    </>
  )
}
