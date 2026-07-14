'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/quote'
import type { Customer, Project, ProductLine } from '@/lib/types'

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<ProductLine[]>([])

  useEffect(() => {
    async function load() {
      const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single()
      setProject(projectData as Project)

      if (projectData?.customer_id) {
        const { data: customerData } = await supabase.from('customers').select('*').eq('id', projectData.customer_id).single()
        setCustomer(customerData as Customer)
      }

      const { data: lineData } = await supabase
        .from('product_lines')
        .select('*')
        .eq('project_id', id)
        .order('sort_order')

      setLines((lineData || []) as ProductLine[])
    }

    load()
  }, [id])

  const total = useMemo(() => {
    return lines.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.manual_price || 0), 0)
  }, [lines])

  if (!project) return <div className="card">Laden...</div>

  return (
    <>
      <div className="card">
        <h1>{project.project_name}</h1>
        <p className="muted">{customer?.customer_name} · {project.city} · {project.status}</p>
        <div className="row">
          <Link className="button" href={`/projects/${project.id}/product-lines/new`}>Productregel toevoegen</Link>
          <Link className="button secondary" href={`/projects/${project.id}/quote`}>Offerte maken</Link>
          <Link className="button secondary" href={`/projects/${project.id}/photos`}>Foto's</Link>
          <Link className="button secondary" href={`/projects/${project.id}/appointments/new`}>Afspraak toevoegen</Link>
        </div>
      </div>

      <div className="card">
        <h2>Productregels</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Ruimte</th>
              <th>Product</th>
              <th>Maat</th>
              <th>Aantal</th>
              <th>Prijs</th>
              <th>Subtotaal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.room}</td>
                <td>{line.product_type}</td>
                <td>{line.width_mm && line.height_mm ? `${line.width_mm} x ${line.height_mm}` : '-'}</td>
                <td>{line.quantity}</td>
                <td>{formatEuro(line.manual_price)}</td>
                <td>{formatEuro(Number(line.quantity || 1) * Number(line.manual_price || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Totaal: {formatEuro(total)}</h2>
      </div>
    </>
  )
}
