'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type ProjectRow = {
  id: string
  project_name: string
  city: string
  status: string
  quote_status: string
  customers?: { customer_name: string } | null
}

const filterStatuses = [
  'Alle statussen',
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

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Alle statussen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error: queryError } = await supabase
        .from('projects')
        .select('id, project_name, city, status, quote_status, customers(customer_name)')
        .order('created_at', { ascending: false })

      if (!mounted) return
      setLoading(false)
      if (queryError) {
        setError(`Projecten konden niet worden geladen: ${queryError.message}`)
        return
      }
      setProjects((data || []) as ProjectRow[])
    }
    load()
    return () => { mounted = false }
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('nl-NL')
    return projects.filter((project) => {
      const matchesStatus = status === 'Alle statussen' || project.status === status
      const matchesText = !term || [project.project_name, project.city, project.status, project.customers?.customer_name]
        .some((value) => String(value || '').toLocaleLowerCase('nl-NL').includes(term))
      return matchesStatus && matchesText
    })
  }, [projects, search, status])

  function openProject(id: string) { router.push(`/projects/${id}`) }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h1>Projecten</h1><p className="muted">Doorzoek aanvragen en volg de status van iedere opdracht.</p></div>
        <Link className="button" href="/projects/new">Nieuw project</Link>
      </div>
      <div className="grid grid-2" style={{ marginTop: 18, marginBottom: 14 }}>
        <label>
          Zoek project
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Klant, project, plaats of status" autoComplete="off" />
        </label>
        <label>
          Filter op status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {filterStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      {loading && <p className="muted" role="status">Projecten laden...</p>}
      {error && <p role="alert" style={{ color: '#9c2424' }}>{error} <Link href="/login"><u>Opnieuw inloggen</u></Link></p>}
      {!loading && !error && (
        <>
          <p className="muted">{visible.length} van {projects.length} projecten</p>
          {projects.length === 0 ? (
            <p>Er zijn nog geen projecten.</p>
          ) : visible.length === 0 ? (
            <p>Geen projecten gevonden met deze zoekterm of status.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Klant</th><th>Project</th><th>Plaats</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {visible.map((project) => (
                    <tr
                      key={project.id}
                      role="link"
                      tabIndex={0}
                      title="Klik om project te openen"
                      aria-label={`Open project ${project.project_name}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openProject(project.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openProject(project.id)
                        }
                      }}
                    >
                      <td>{project.customers?.customer_name || '-'}</td>
                      <td><strong>{project.project_name}</strong></td>
                      <td>{project.city}</td>
                      <td>{project.status}</td>
                      <td><Link href={`/projects/${project.id}`} onClick={(event) => event.stopPropagation()}>Openen</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
