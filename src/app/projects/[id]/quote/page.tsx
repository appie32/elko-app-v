'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QuotePreview from '@/components/QuotePreview'
import { supabase } from '@/lib/supabase/client'
import {
  buildAccompanyingMessage,
  buildQuoteText,
  formatEuro,
  lineTotal,
} from '@/lib/quote'
import type { Customer, ProductLine, Project } from '@/lib/types'

type QuoteRecord = {
  id: string
  project_id: string
  quote_number: string
  quote_date: string
  total_amount: number
  status: string
  intro_text: string | null
  body_text: string | null
  full_quote_text: string
  customer_snapshot: Customer | null
  project_snapshot: (Project & { contact_person?: string; quote_style?: 'executive' | 'signature'; installation_notes?: string }) | null
  product_lines_snapshot: ProductLine[] | null
}

const people = ['Alexa', 'Manuela', 'Abdullah']
const earlyStatuses = ['Nieuwe aanvraag', 'Inmeting gepland', 'Ingemeten', 'Offerte gemaakt']
const offerStatuses = [...earlyStatuses, 'Offerte verzonden']

function makeQuoteNumber(): string {
  // Uniek en blijvend nummer, onafhankelijk van downloads. Nog niet oplopend.
  const year = new Date().getFullYear()
  const unique = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `ELKO-${year}-${unique}`
}

function dateNL(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('nl-NL')
}

export default function QuotePage() {
  const { id } = useParams<{ id: string }>()
  const projectId = String(id)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [lines, setLines] = useState<ProductLine[]>([])
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [contactPerson, setContactPerson] = useState('Alexa')
  const [quoteStyle, setQuoteStyle] = useState<'executive' | 'signature'>('executive')
  const [installationNotes, setInstallationNotes] = useState('')
  const [messageText, setMessageText] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyPdf, setBusyPdf] = useState(false)

  const savedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? null
  const viewedCustomer = savedQuote?.customer_snapshot ?? customer
  const viewedProject = savedQuote?.project_snapshot ?? project
  const viewedLines = savedQuote?.product_lines_snapshot ?? lines
  const viewedTotal = savedQuote ? Number(savedQuote.total_amount) : lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const viewedContact = savedQuote?.project_snapshot?.contact_person || contactPerson
  const viewedStyle = savedQuote
    ? (savedQuote.project_snapshot?.quote_style === 'signature' ? 'signature' : 'executive')
    : quoteStyle
  const viewedNotes = savedQuote
    ? (savedQuote.project_snapshot?.installation_notes || '')
    : installationNotes
  const currentMessage = savedQuote ? (savedQuote.intro_text || '') : messageText

  const sortedLines = useMemo(
    () => [...viewedLines].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [viewedLines]
  )

  useEffect(() => {
    let active = true
    async function load() {
      const { data: projectData, error: projectError } = await supabase
        .from('projects').select('*').eq('id', projectId).single()
      if (!active) return
      if (projectError || !projectData) {
        setError(projectError?.message || 'Project niet gevonden.'); setLoading(false); return
      }
      const [customerResult, linesResult, quotesResult] = await Promise.all([
        supabase.from('customers').select('*').eq('id', projectData.customer_id).single(),
        supabase.from('product_lines').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('quotes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(100),
      ])
      if (!active) return
      if (customerResult.error || linesResult.error || quotesResult.error) {
        setError(customerResult.error?.message || linesResult.error?.message || quotesResult.error?.message || 'Gegevens laden mislukt.')
        setLoading(false); return
      }
      const nextCustomer = customerResult.data as Customer
      const nextProject = projectData as Project
      const nextLines = (linesResult.data || []) as ProductLine[]
      const nextQuotes = (quotesResult.data || []) as QuoteRecord[]
      setCustomer(nextCustomer)
      setProject(nextProject)
      setLines(nextLines)
      setQuotes(nextQuotes)
      const total = nextLines.reduce((sum, line) => sum + lineTotal(line), 0)
      setMessageText(buildAccompanyingMessage({ customer: nextCustomer, project: nextProject, totalAmount: total }))
      const requestedQuote = new URLSearchParams(window.location.search).get('quote')
      if (requestedQuote && nextQuotes.some((quote) => quote.id === requestedQuote)) {
        setSelectedQuoteId(requestedQuote)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [projectId])

  function chooseContact(name: string) {
    setContactPerson(name)
    setMessageText((previous) => {
      const before = people.find((person) => previous.includes(`${person} - ELKO Solutions`))
      if (before) return previous.replace(`${before} - ELKO Solutions`, `${name} - ELKO Solutions`)
      return previous
    })
  }

  async function saveQuote() {
    if (!customer || !project || saving || savedQuote) return
    if (!lines.length) { setNotice('Voeg eerst minimaal één productregel toe.'); return }
    setSaving(true)
    setNotice('Offerte wordt opgeslagen...')
    const total = lines.reduce((sum, line) => sum + lineTotal(line), 0)
    const snapshot = {
      ...project,
      contact_person: contactPerson,
      quote_style: quoteStyle,
      installation_notes: installationNotes.trim(),
    }
    let inserted: QuoteRecord | null = null
    let insertError = ''
    // De UNIQUE-constraint in Supabase beschermt ook bij een uitzonderlijke nummerbotsing.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error: dbError } = await supabase.from('quotes').insert({
        project_id: project.id,
        quote_number: makeQuoteNumber(),
        total_amount: total,
        customer_snapshot: customer,
        project_snapshot: snapshot,
        product_lines_snapshot: lines,
        full_quote_text: buildQuoteText({ customer, project, productLines: lines, totalAmount: total }) +
          (installationNotes.trim() ? `\n\nBijzonderheden / montage\n${installationNotes.trim()}` : ''),
        intro_text: messageText,
        body_text: '', // introductie hoort bij de begeleidende tekst, niet op de offerte
        status: 'Opgeslagen',
      }).select('*').single()
      if (!dbError && data) { inserted = data as QuoteRecord; break }
      insertError = dbError?.message || 'Onbekende fout bij opslaan.'
      if (dbError?.code !== '23505') break
    }
    if (!inserted) { setNotice(`Opslaan mislukt: ${insertError}`); setSaving(false); return }

    setQuotes((previous) => [inserted!, ...previous])
    setSelectedQuoteId(inserted.id)
    let statusMessage = ''
    if (earlyStatuses.includes(project.status)) {
      const { error: projectError } = await supabase.from('projects')
        .update({ quote_status: 'Gemaakt', status: 'Offerte gemaakt' }).eq('id', project.id)
      if (projectError) statusMessage = ` Projectstatus kon niet worden bijgewerkt: ${projectError.message}`
      else setProject((previous) => previous ? { ...previous, status: 'Offerte gemaakt', quote_status: 'Gemaakt' } : previous)
    }
    setSaving(false)
    setNotice(`Offerte ${inserted.quote_number} is opgeslagen. Je kunt nu de PDF downloaden.${statusMessage}`)
  }

  async function markSent() {
    if (!savedQuote || !project || saving) return
    if (!window.confirm(`Heb je offerte ${savedQuote.quote_number} daadwerkelijk naar de klant verstuurd? De app verstuurt zelf geen e-mail of WhatsApp.`)) return
    setSaving(true)
    const { error: quoteError } = await supabase.from('quotes').update({ status: 'Verzonden' }).eq('id', savedQuote.id)
    if (quoteError) { setNotice(`Status opslaan mislukt: ${quoteError.message}`); setSaving(false); return }
    setQuotes((previous) => previous.map((quote) => quote.id === savedQuote.id ? { ...quote, status: 'Verzonden' } : quote))
    if (offerStatuses.includes(project.status)) {
      const { error: projectError } = await supabase.from('projects')
        .update({ quote_status: 'Verzonden', status: 'Offerte verzonden' }).eq('id', project.id)
      if (projectError) {
        setNotice(`Offerte gemarkeerd als verzonden, maar de projectstatus kon niet worden bijgewerkt: ${projectError.message}`)
        setSaving(false); return
      }
      setProject((previous) => previous ? { ...previous, quote_status: 'Verzonden', status: 'Offerte verzonden' } : previous)
    }
    setNotice('Offerte gemarkeerd als verzonden. Dit is een administratieve registratie; er is niets automatisch verstuurd.')
    setSaving(false)
  }

  async function downloadPdf() {
    if (!savedQuote || !viewedCustomer || !viewedProject || busyPdf) {
      setNotice('Sla eerst de offerte op om een PDF met een vast offertenummer te downloaden.')
      return
    }
    setBusyPdf(true)
    setNotice('PDF wordt gemaakt...')
    try {
      const response = await fetch('/api/quote-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNumber: savedQuote.quote_number,
          quoteDate: dateNL(savedQuote.quote_date),
          customer: viewedCustomer,
          project: viewedProject,
          productLines: sortedLines,
          totalAmount: viewedTotal,
          contactPerson: viewedContact,
          quoteStyle: viewedStyle,
          installationNotes: viewedNotes,
        }),
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.error || `HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${savedQuote.quote_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 4000)
      setNotice(`PDF ${savedQuote.quote_number}.pdf is gedownload.`)
    } catch (err) {
      setNotice(`PDF maken mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    } finally {
      setBusyPdf(false)
    }
  }

  async function copyMessage() {
    if (!currentMessage.trim()) { setNotice('Bij deze oude offerte is geen begeleidende tekst opgeslagen.'); return }
    try {
      await navigator.clipboard.writeText(currentMessage)
      setNotice('Begeleidende tekst gekopieerd. Je kunt hem nu in WhatsApp of e-mail plakken.')
    } catch { setNotice('Kopiëren mislukt. Selecteer en kopieer de tekst handmatig.') }
  }

  if (loading) return <div className="card">Offertes laden...</div>
  if (error) return <div className="card" role="alert">Laden mislukt: {error}. <Link href="/login">Opnieuw inloggen</Link></div>
  if (!customer || !project || !viewedCustomer || !viewedProject) return <div className="card">Projectgegevens ontbreken.</div>

  return (
    <>
      <div className="card">
        <p className="muted">ELKO Solutions / ELKO Horren</p>
        <h1>{savedQuote ? `Offerte ${savedQuote.quote_number}` : 'Nieuwe offerte opstellen'}</h1>
        <p className="muted">{viewedCustomer.customer_name} · {viewedProject.project_name}</p>
        {savedQuote && <p>Opgeslagen op {dateNL(savedQuote.quote_date)} · <strong>{savedQuote.status}</strong></p>}
        <div className="row" style={{ marginTop: 16 }}>
          <Link className="button secondary" href={`/projects/${projectId}`}>Terug naar project</Link>
          <Link className="button secondary" href="/quotes">Alle offertes</Link>
          {savedQuote ? (
            <>
              <button onClick={() => {
                setQuoteStyle(viewedStyle)
                setInstallationNotes(viewedNotes)
                setContactPerson(viewedContact)
                setSelectedQuoteId(null)
                setNotice('Nieuwe offerteversie: controleer de actuele gegevens en sla opnieuw op.')
              }}>Nieuwe offerteversie</button>
              <button className="button secondary" disabled={busyPdf} onClick={downloadPdf}>{busyPdf ? 'PDF maken...' : 'PDF downloaden'}</button>
              <button className="button secondary" disabled={saving || savedQuote.status === 'Verzonden'} onClick={markSent}>Markeer als verzonden</button>
            </>
          ) : (
            <button disabled={saving || !lines.length} onClick={saveQuote}>{saving ? 'Opslaan...' : 'Offerte opslaan'}</button>
          )}
          <button className="button secondary" onClick={copyMessage}>Begeleidende tekst kopiëren</button>
        </div>
        {notice && <p role="status" style={{ marginTop: 16, color: '#4A3520' }}>{notice}</p>}
      </div>

      <div className="card">
        <h2>Offertehistorie van dit project</h2>
        {quotes.length === 0 ? <p className="muted">Nog geen offertes opgeslagen.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Offertenummer</th><th>Datum</th><th>Totaal</th><th>Status</th><th>Actie</th></tr></thead>
              <tbody>{quotes.map((quote) => (
                <tr key={quote.id}>
                  <td><strong>{quote.quote_number}</strong></td>
                  <td>{dateNL(quote.quote_date)}</td>
                  <td>{formatEuro(quote.total_amount)}</td>
                  <td>{quote.status}</td>
                  <td><button className="button secondary" onClick={() => { setSelectedQuoteId(quote.id); setNotice('') }}>Bekijken</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {!savedQuote && (
        <div className="card">
          <h2>Offertegegevens</h2>
          <div className="grid grid-2">
            <label>Contactpersoon ELKO
              <select value={contactPerson} onChange={(event) => chooseContact(event.target.value)}>
                {people.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>Opmaak offerte
              <select value={quoteStyle} onChange={(event) => setQuoteStyle(event.target.value === 'signature' ? 'signature' : 'executive')}>
                <option value="executive">Executive - donkerblauw en goud</option>
                <option value="signature">Signature - warm beige en taupe</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 18 }}>
            Bijzonderheden / montage (optioneel)
            <textarea
              value={installationNotes}
              onChange={(event) => setInstallationNotes(event.target.value)}
              maxLength={900}
              placeholder="Bijvoorbeeld: bestaande hordeur verwijderen, onderprofiel behouden of bijzonderheden over bevestiging. Laat leeg als er geen bijzonderheden zijn."
              style={{ minHeight: 110 }}
            />
          </label>
          <p className="muted">Deze tekst verschijnt alleen op de offerte als je iets invult. De gekozen opmaak en bijzonderheden worden opgeslagen bij deze offerteversie.</p>
        </div>
      )}

      <div className="card">
        <h2>Begeleidende tekst voor WhatsApp of e-mail</h2>
        <textarea value={currentMessage} onChange={(event) => { if (!savedQuote) setMessageText(event.target.value) }} readOnly={!!savedQuote} style={{ minHeight: 205 }}/>
        <p className="muted">Deze tekst wordt niet automatisch verstuurd. Bij een opgeslagen offerte blijft de oorspronkelijke tekst bewaard.</p>
      </div>

      <div className="card">
        <h2>Offertevoorbeeld</h2>
        <QuotePreview
          customer={viewedCustomer}
          project={viewedProject}
          lines={sortedLines}
          quoteNumber={savedQuote?.quote_number}
          quoteDate={savedQuote?.quote_date}
          contactPerson={viewedContact}
          total={viewedTotal}
          quoteStyle={viewedStyle}
          installationNotes={viewedNotes}
        />
        {!savedQuote && <p className="muted">Sla de offerte op om de PDF met hetzelfde offertenummer te downloaden.</p>}
      </div>
    </>
  )
}
