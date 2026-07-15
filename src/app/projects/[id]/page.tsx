'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/quote'
import type { Customer, ProductLine, Project } from '@/lib/types'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<ProductLine[]>([])

  async function load() {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    setProject(projectData as Project)

    if (projectData?.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', projectData.customer_id)
        .single()

      setCustomer(customerData as Customer)
    }

    const { data: lineData } = await supabase
      .from('product_lines')
      .select('*')
      .eq('project_id', id)
      .order('sort_order')

    setLines((lineData || []) as ProductLine[])
  }

  useEffect(() => {
    load()
  }, [id])

  const total = useMemo(() => {
    return lines.reduce((sum, line) => {
      return sum + Number(line.quantity || 1) * Number(line.manual_price || 0)
    }, 0)
  }, [lines])

  async function duplicateLine(line: ProductLine, event: React.MouseEvent) {
    event.stopPropagation()

    const copy: any = { ...line }

    delete copy.id
    delete copy.created_at
    delete copy.updated_at
    delete copy.subtotal

    copy.room = `${line.room || 'Ruimte'} kopie`
    copy.sort_order = lines.length + 1

    const { error } = await supabase.from('product_lines').insert(copy)

    if (error) {
      alert(error.message)
      return
    }

    await load()
  }

  async function deleteLine(line: ProductLine, event: React.MouseEvent) {
    event.stopPropagation()

    const confirmed = confirm(
      `Productregel verwijderen: ${line.product_type} - ${line.room || 'zonder ruimte'}?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('product_lines')
      .delete()
      .eq('id', line.id)

    if (error) {
      alert(error.message)
      return
    }

    await load()
  }

  if (!project) {
    return <div className="card">Laden...</div>
  }

  return (
    <>
      <div className="card">
        <h1>{project.project_name}</h1>
        <p className="muted">
          {customer?.customer_name} · {project.city} · {project.status}
        </p>

        <div className="row">
          <Link
            className="button"
            href={`/projects/${project.id}/product-lines/new`}
          >
            Productregel toevoegen
          </Link>

          <Link
            className="button secondary"
            href={`/projects/${project.id}/quote`}
          >
            Offerte maken
          </Link>

          <Link
            className="button secondary"
            href={`/projects/${project.id}/photos`}
          >
            Foto&apos;s
          </Link>

          <Link
            className="button secondary"
            href={`/projects/${project.id}/appointments/new`}
          >
            Afspraak toevoegen
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Productregels</h2>
        <p className="muted">
          Klik op een regel om hem te openen. Gebruik kopiëren voor vergelijkbare
          horren en verwijderen voor fout aangemaakte regels.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Ruimte</th>
              <th>Product</th>
              <th>Maat</th>
              <th>Aantal</th>
              <th>Bedrag</th>
              <th>Acties</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id}
                onClick={() =>
                  router.push(
                    `/projects/${project.id}/product-lines/${line.id}/edit`
                  )
                }
                style={{ cursor: 'pointer' }}
              >
                <td>{line.room || '-'}</td>
                <td>{line.product_type}</td>
                <td>
                  {line.width_mm && line.height_mm
                    ? `${line.width_mm} x ${line.height_mm}`
                    : '-'}
                </td>
                <td>{line.quantity}</td>
                <td>
                  {formatEuro(
                    Number(line.quantity || 1) * Number(line.manual_price || 0)
                  )}
                </td>
                <td>
                  <div className="row">
                    <button
                      className="button secondary"
                      onClick={(event) => duplicateLine(line, event)}
                    >
                      Kopiëren
                    </button>

                    <button
                      className="button secondary"
                      onClick={(event) => deleteLine(line, event)}
                    >
                      Verwijderen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Totaal: {formatEuro(total)}</h2>
      </div>
    </>
  )
}
