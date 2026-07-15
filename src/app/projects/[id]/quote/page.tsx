'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import {
  buildAccompanyingMessage,
  buildQuoteText,
  formatEuro,
  lineTotal,
  productDetail,
  productTitle,
} from '@/lib/quote'
import type { Customer, ProductLine, Project } from '@/lib/types'

function makeQuoteNumber() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900 + 100)
  return `ELKO-${year}-${random}`
}

export default function QuotePage() {
  const params = useParams()
  const projectId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [lines, setLines] = useState<ProductLine[]>([])
  const [quoteText, setQuoteText] = useState('')
  const [messageText, setMessageText] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const total = useMemo(() => {
    return lines.reduce((sum, line) => sum + lineTotal(line), 0)
  }, [lines])

  useEffect(() => {
    async function load() {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
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
        .eq('project_id', projectId)
        .order('sort_order')

      setLines((lineData || []) as ProductLine[])
    }

    load()
  }, [projectId])

  useEffect(() => {
    if (customer && project) {
      setQuoteText(
        buildQuoteText({
          customer,
          project,
          productLines: lines,
          totalAmount: total,
        })
      )

      setMessageText(
        buildAccompanyingMessage({
          customer,
          project,
          totalAmount: total,
        })
      )
    }
  }, [customer, project, lines, total])

  async function saveQuote() {
    if (!customer || !project || saving) return

    setSaving(true)
    setMessage('Offerte opslaan...')

    const quoteNumber = makeQuoteNumber()

    const { error } = await supabase.from('quotes').insert({
      project_id: project.id,
      quote_number: quoteNumber,
      total_amount: total,
      customer_snapshot: customer,
      project_snapshot: project,
      product_lines_snapshot: lines,
      full_quote_text: quoteText,
      status: 'Opgeslagen',
    })

    if (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }

    await supabase
      .from('projects')
      .update({
        quote_status: 'Gemaakt',
        status: 'Offerte gemaakt',
      })
      .eq('id', project.id)

    setProject((prev) =>
      prev
        ? {
            ...prev,
            quote_status: 'Gemaakt',
            status: 'Offerte gemaakt',
          }
        : prev
    )

    setSaving(false)
    setMessage(`Offerte opgeslagen als ${quoteNumber}. Projectstatus is aangepast naar Offerte gemaakt.`)
  }

  async function markSent() {
    if (!project) return

    const { error } = await supabase
      .from('projects')
      .update({
        quote_status: 'Verzonden',
        status: 'Offerte verzonden',
      })
      .eq('id', project.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setProject((prev) =>
      prev
        ? {
            ...prev,
            quote_status: 'Verzonden',
            status: 'Offerte verzonden',
          }
        : prev
    )

    setMessage('Projectstatus aangepast naar Offerte verzonden.')
  }

  async function copyText() {
    await navigator.clipboard.writeText(quoteText)
    setMessage('Offertetekst gekopieerd.')
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(messageText)
    setMessage('Begeleidende tekst gekopieerd. Deze kun je gebruiken voor WhatsApp of e-mail.')
  }

  async function downloadPdf() {
    if (!customer || !project) return

    const quoteNumber = makeQuoteNumber()

    const response = await fetch('/api/quote-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteNumber,
        quoteDate: new Date().toLocaleDateString('nl-NL'),
        documentType: 'OFFERTE',
        customer,
        project,
        productLines: lines,
        totalAmount: total,
        subject: 'maatwerk horren',
      }),
    })

    if (!response.ok) {
      setMessage('PDF kon niet worden gemaakt.')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${quoteNumber}.pdf`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)

    setMessage(`PDF gedownload als ${quoteNumber}.pdf`)
  }

  if (!customer || !project) {
    return <div className="card">Offerte laden...</div>
  }

  return (
    <>
      <div className="card">
        <p className="muted">Elko Solutions · Elko Horren</p>
        <h1>Offerte maken</h1>

        <p className="muted">
          {customer.customer_name} · {project.project_name} · {project.status}
        </p>

        <div className="row">
          <Link className="button secondary" href={`/projects/${project.id}`}>
            Terug naar project
          </Link>

          <button disabled={saving} onClick={saveQuote}>
            {saving ? 'Opslaan...' : 'Offerte opslaan'}
          </button>

          <button className="button secondary" onClick={copyMessage}>
            Begeleidende tekst kopiëren
          </button>

          <button className="button secondary" onClick={copyText}>
            Offertetekst kopiëren
          </button>

          <button className="button secondary" onClick={downloadPdf}>
            PDF downloaden
          </button>

          <button className="button secondary" onClick={markSent}>
            Markeer als verzonden
          </button>
        </div>

        {message && <p className="muted">{message}</p>}
      </div>

      <div className="card">
        <h2>Begeleidende tekst voor WhatsApp of e-mail</h2>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          style={{ minHeight: 190 }}
        />
      </div>

      <div className="card">
        <h2>Offerte-preview</h2>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 18,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <div
            style={{
              background: '#4A3520',
              color: '#fff',
              padding: 24,
            }}
          >
            <p style={{ margin: 0, opacity: 0.85 }}>Elko Solutions</p>
            <h2 style={{ margin: '4px 0 0' }}>Offerte maatwerk horren</h2>
            <p style={{ margin: '8px 0 0', opacity: 0.85 }}>
              Elko Horren · Gepaste beleving op ieder vlak
            </p>
          </div>

          <div style={{ padding: 24 }}>
            <div className="grid grid-2">
              <div>
                <p className="muted">Voor</p>
                <strong>{customer.customer_name}</strong>
                <p className="muted">
                  {[customer.street, customer.house_number].filter(Boolean).join(' ')}
                  <br />
                  {[customer.postal_code, customer.city].filter(Boolean).join(' ')}
                </p>
              </div>

              <div>
                <p className="muted">Project</p>
                <strong>{project.project_name}</strong>
                <p className="muted">
                  Status: {project.status}
                  <br />
                  Datum: {new Date().toLocaleDateString('nl-NL')}
                </p>
              </div>
            </div>

            <p style={{ marginTop: 24, lineHeight: 1.6 }}>
              Bedankt voor uw aanvraag. Op basis van de besproken situatie hebben
              wij onderstaande offerte opgesteld voor maatwerk horren, inclusief
              levering en montage.
            </p>

            <table className="table">
              <thead>
                <tr>
                  <th>Omschrijving</th>
                  <th>Aantal</th>
                  <th>Bedrag</th>
                </tr>
              </thead>

              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <strong>{productTitle(line)}</strong>
                      <br />
                      <span className="muted">{productDetail(line)}</span>
                    </td>
                    <td>{line.quantity || 1}</td>
                    <td>{formatEuro(lineTotal(line))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 14,
                background: '#E7DCC9',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <strong>Totaal incl. btw</strong>
              <strong style={{ fontSize: 22 }}>{formatEuro(total)}</strong>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3>Toelichting</h3>
              <ul>
                <li>De offerte is gebaseerd op de ingevoerde maatvoering en besproken uitvoering.</li>
                <li>Bij montage controleren wij de situatie en zorgen wij voor een nette afwerking.</li>
                <li>Betaling kan na montage worden voldaan, tenzij anders afgesproken.</li>
                <li>Garantie: 2 jaar op materiaal en fabricage bij normaal gebruik.</li>
              </ul>
            </div>

            <p style={{ marginTop: 24 }}>
              Met vriendelijke groet,
              <br />
              <strong>Elko Solutions</strong>
              <br />
              Elko Horren
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Bewerkbare volledige offertetekst</h2>
        <textarea
          value={quoteText}
          onChange={(e) => setQuoteText(e.target.value)}
          style={{ minHeight: 520, fontFamily: 'monospace' }}
        />
      </div>
    </>
  )
}
