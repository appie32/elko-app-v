'use client'

import { useEffect, useState } from 'react'
import type { Customer, ProductLine, Project } from '@/lib/types'

type Props = {
  customer: Customer
  project: Project
  lines: ProductLine[]
  quoteNumber?: string
  quoteDate?: string
  contactPerson: string
  total: number
  quoteStyle: 'executive' | 'signature'
  installationNotes?: string
}

// De preview is dezelfde PDF als de download: één bron, identieke opmaak.
export default function QuotePreview({
  customer,
  project,
  lines,
  quoteNumber,
  quoteDate,
  contactPerson,
  total,
  quoteStyle,
  installationNotes,
}: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let previewUrl = ''

    async function loadPdf() {
      setLoading(true)
      setError('')
      setUrl('')
      try {
        // Voor een concept wordt bewust geen definitief offertenummer gemaakt.
        const displayDate = quoteDate
          ? new Date(`${quoteDate.slice(0, 10)}T12:00:00`).toLocaleDateString('nl-NL')
          : new Date().toLocaleDateString('nl-NL')
        const response = await fetch('/api/quote-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteNumber: quoteNumber || 'CONCEPT',
            quoteDate: displayDate,
            customer,
            project,
            productLines: lines,
            totalAmount: total,
            contactPerson,
            quoteStyle,
            installationNotes: installationNotes || '',
          }),
        })
        if (!response.ok) {
          const problem = await response.json().catch(() => ({}))
          throw new Error(problem.error || `PDF kon niet worden gemaakt (HTTP ${response.status}).`)
        }
        const blob = await response.blob()
        if (!active) return
        previewUrl = URL.createObjectURL(blob)
        setUrl(previewUrl)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Voorvertoning niet beschikbaar.')
      } finally {
        if (active) setLoading(false)
      }
    }

    // Voorkom een nieuwe PDF-aanvraag bij iedere toetsaanslag in het notitieveld.
    const timer = window.setTimeout(loadPdf, 280)
    return () => {
      window.clearTimeout(timer)
      active = false
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [customer, project, lines, quoteNumber, quoteDate, contactPerson, total, quoteStyle, installationNotes])

  return (
    <section style={{ background: '#f7f4ef', border: '1px solid #e1d7ca', borderRadius: 12, padding: 12 }}>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#695e51' }}>
        Dit is een voorvertoning van de echte A4-PDF. Je ziet precies de opmaak die de klant ontvangt.
      </p>
      {loading && <p role="status">Offertevoorbeeld laden...</p>}
      {error && <p role="alert" style={{ color: '#a32626' }}>{error}</p>}
      {url && (
        <>
          <iframe
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            title="Voorvertoning ELKO-offerte PDF"
            style={{ display: 'block', width: '100%', height: 'min(1050px, 85vh)', minHeight: 430, background: '#fff', border: 0, borderRadius: 5 }}
          />
          <p style={{ marginTop: 10, fontSize: 14 }}>
            <a href={url} target="_blank" rel="noopener noreferrer">Open de volledige PDF in een nieuw tabblad</a>
          </p>
        </>
      )}
    </section>
  )
}
