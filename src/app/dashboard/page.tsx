'use client'

import { useEffect, useState } from 'react'
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

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error: queryError } = await supabase
        .from('projects')
        .select('id, project_name, city, status, quote_status, customers(customer_name)')
        .order('created_at', { ascending: false })
        .limit(10)

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

  function openProject(id: string) { router.push(`/projects/${id}`) }

  return (
    <>
      <div className="card">
        <h1>Dashboard</h1>
        <p className="muted">Welkom bij ELKO Solutions. Beheer hier je klanten, projecten en aanvragen.</p>
        <div className="row">
          <Link className="button" href="/customers/new">Nieuwe klant</Link>
          <Link className="button secondary" href="/projects/new">Nieuw project</Link>
          <Link className="button secondary" href="/projects">Alle projecten / zoeken</Link>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><h2>Recente projecten</h2><p className="muted">Klik ergens op een projectregel om het project te openen.</p></div>
          <Link href="/projects">Bekijk alle projecten</Link>
        </div>
        {loading && <p className="muted" role="status">Projecten laden...</p>}
        {error && <p role="alert" style={{ color: '#9c2424' }}>{error} <Link href="/login"><u>Opnieuw inloggen</u></Link></p>}
        {!loading && !error && projects.length === 0 && <p>Er zijn nog geen projecten.</p>}
        {!loading && !error && projects.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Klant</th><th>Project</th><th>Plaats</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {projects.map((project) => (
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
      </div>
    </>
  )
}
