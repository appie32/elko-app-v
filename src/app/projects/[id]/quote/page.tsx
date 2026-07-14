'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildAccompanyingMessage, buildQuoteText, formatEuro } from '@/lib/quote'
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

  const total = useMemo(() => {
    return lines.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.manual_price || 0), 0)
  }, [lines])

  useEffect(() => {
    async function load() {
      const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single()
      setProject(projectData as Project)

      if (projectData?.customer_id) {
        const { data: customerData } = await supabase.from('customers').select('*').eq('id', projectData.customer_id).single()
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
      setQuoteText(buildQuoteText({ customer, project, productLines: lines, totalAmount: total }))
      setMessageText(buildAccompanyingMessage({ customer, project, totalAmount: total }))
    }
  }, [customer, project, lines, total])

  async function saveQuote() {
    if (!customer || !project) return

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
      alert(error.message)
      return
    }

    await supabase
      .from('projects')
      .update({ quote_status: 'Gemaakt', status: 'Offerte gemaakt' })
      .eq('id', project.id)

    setMessage(`Offerte opgeslagen als ${quoteNumber}. Je kunt de PDF nu downloaden.`)
  }

  function copyText() {
    navigator.clipboard.writeText(quoteText)
    setMessage('Offertetekst gekopieerd.')
  }

  function copyMessage() {
    navigator.clipboard.writeText(messageText)
    setMessage('Begeleidend bericht gekopieerd.')
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

  if (!customer || !project) return <div className="card">Laden...</div>

  return (
    <>
      <div className="card">
        <h1>Offerte maken</h1>
        <p className="muted">{customer.customer_name} · {project.project_name}</p>
        <h2>Totaal: {formatEuro(total)}</h2>
        <div className="row">
          <button onClick={saveQuote}>Offerte opslaan</button>
          <button className="button secondary" onClick={copyText}>Tekst kopiëren</button>
          <button className="button secondary" onClick={downloadPdf}>PDF downloaden</button>
        </div>
        {message && <p className="muted">{message}</p>}
      </div>

      <div className="card">
        <h2>Offerte-preview</h2>
        <textarea
          value={quoteText}
          onChange={(e) => setQuoteText(e.target.value)}
          style={{ minHeight: 520, fontFamily: 'monospace' }}
        />
      </div>
    </>
  )
}
