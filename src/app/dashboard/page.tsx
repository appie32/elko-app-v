'use client'

import { useEffect, useState } from 'react'
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
  const [projects, setProjects] = useState<ProjectRow[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, city, status, quote_status, customers(customer_name)')
        .order('created_at', { ascending: false })
        .limit(10)

      setProjects((data || []) as ProjectRow[])
    }

    load()
  }, [])

  return (
    <>
      <div className="card">
        <h1>Dashboard</h1>
        <p className="muted">Overzicht van recente projecten.</p>
        <div className="row">
          <Link className="button" href="/customers/new">Nieuwe klant</Link>
          <Link className="button secondary" href="/projects/new">Nieuw project</Link>
        </div>
      </div>

      <div className="card">
        <h2>Recente projecten</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Klant</th>
              <th>Project</th>
              <th>Plaats</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.customers?.customer_name || '-'}</td>
                <td>{project.project_name}</td>
                <td>{project.city}</td>
                <td>{project.status}</td>
                <td><Link href={`/projects/${project.id}`}>Openen</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
