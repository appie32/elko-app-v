'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/quote'

type QuoteListRow = {
  id: string
  project_id: string
  quote_number: string
  quote_date: string
  status: string
  total_amount: number
  customer_snapshot?: { customer_name?: string } | null
  project_snapshot?: { project_name?: string } | null
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteListRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Alle statussen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: dbError } = await supabase.from('quotes')
        .select('id, project_id, quote_number, quote_date, status, total_amount, customer_snapshot, project_snapshot')
        .order('created_at', { ascending: false }).limit(200)
      if (!active) return
      if (dbError) setError(dbError.message)
      else setQuotes((data || []) as QuoteListRow[])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('nl-NL')
    return quotes.filter((quote) => {
      if (filter !== 'Alle statussen' && quote.status !== filter) return false
      return [quote.quote_number, quote.customer_snapshot?.customer_name, quote.project_snapshot?.project_name]
        .some((field) => String(field || '').toLocaleLowerCase('nl-NL').includes(term))
    })
  }, [quotes, search, filter])

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h1>Offertes</h1><p className="muted">Opgeslagen offertes met hun eigen nummer, totaal en status.</p></div>
        <Link className="button" href="/projects">Offerte maken vanuit project</Link>
      </div>
      <div className="grid grid-2" style={{ margin: '18px 0' }}>
        <label>Zoeken
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Offertenummer, klant of project"/>
        </label>
        <label>Status
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            {['Alle statussen', ...Array.from(new Set(quotes.map((quote) => quote.status)))].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      {loading ? <p>Offertes laden...</p> : error ? <p role="alert">Offertes laden mislukt: {error}. <Link href="/login">Opnieuw inloggen</Link></p> : (
        <>
          <p className="muted">{filtered.length} offertes zichtbaar (maximaal de 200 recentste geladen).</p>
          {filtered.length === 0 ? <p>Geen offertes gevonden.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Nummer</th><th>Klant</th><th>Project</th><th>Datum</th><th>Totaal</th><th>Status</th><th></th></tr></thead>
                <tbody>{filtered.map((quote) => (
                  <tr key={quote.id}>
                    <td><strong>{quote.quote_number}</strong></td>
                    <td>{quote.customer_snapshot?.customer_name || '-'}</td>
                    <td>{quote.project_snapshot?.project_name || '-'}</td>
                    <td>{quote.quote_date || '-'}</td>
                    <td>{formatEuro(quote.total_amount)}</td>
                    <td>{quote.status}</td>
                    <td><Link href={`/projects/${quote.project_id}/quote?quote=${quote.id}`}>Openen</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
