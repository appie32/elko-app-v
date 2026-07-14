'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Customer, Project } from '@/lib/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    async function load() {
      const { data: customerData } = await supabase.from('customers').select('*').eq('id', id).single()
      const { data: projectData } = await supabase.from('projects').select('*').eq('customer_id', id).order('created_at', { ascending: false })

      setCustomer(customerData as Customer)
      setProjects((projectData || []) as Project[])
    }

    load()
  }, [id])

  if (!customer) return <div className="card">Laden...</div>

  return (
    <>
      <div className="card">
        <h1>{customer.customer_name}</h1>
        <p className="muted">{customer.city} · {customer.phone}</p>
        <div className="row">
          <Link className="button" href={`/projects/new?customer_id=${customer.id}`}>Nieuw project</Link>
          <Link className="button secondary" href="/customers">Terug</Link>
        </div>
      </div>

      <div className="card">
        <h2>Projecten</h2>
        <table className="table">
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
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
