'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/lib/types'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error: queryError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (!mounted) return
      setLoading(false)
      if (queryError) {
        setError(`Klanten konden niet worden geladen: ${queryError.message}`)
        return
      }
      setCustomers((data || []) as Customer[])
    }
    load()
    return () => { mounted = false }
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('nl-NL')
    if (!term) return customers
    return customers.filter((customer) =>
      [customer.customer_name, customer.phone, customer.email, customer.city, customer.postal_code]
        .some((value) => String(value || '').toLocaleLowerCase('nl-NL').includes(term))
    )
  }, [customers, search])

  function openCustomer(id: string) {
    router.push(`/customers/${id}`)
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Klanten</h1>
          <p className="muted">Zoek en open je klantdossiers.</p>
        </div>
        <Link className="button" href="/customers/new">Nieuwe klant</Link>
      </div>

      <label style={{ marginTop: 18, marginBottom: 14 }}>
        Zoek klant
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Naam, telefoon, e-mail, postcode of plaats"
          autoComplete="off"
        />
      </label>

      {loading && <p className="muted" role="status">Klanten laden...</p>}
      {error && <p role="alert" style={{ color: '#9c2424' }}>{error} <Link href="/login"><u>Opnieuw inloggen</u></Link></p>}
      {!loading && !error && (
        <>
          <p className="muted">{visible.length} van {customers.length} klanten</p>
          {customers.length === 0 ? (
            <p>Er zijn nog geen klanten gevonden.</p>
          ) : visible.length === 0 ? (
            <p>Geen klanten gevonden. Probeer een andere zoekterm.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Naam</th><th>Plaats</th><th>Telefoon</th><th></th></tr></thead>
                <tbody>
                  {visible.map((customer) => (
                    <tr
                      key={customer.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open klant ${customer.customer_name}`}
                      title="Klik om klant te openen"
                      onClick={() => openCustomer(customer.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openCustomer(customer.id)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><strong>{customer.customer_name}</strong></td>
                      <td>{customer.city || '-'}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>
                        <Link href={`/customers/${customer.id}`} onClick={(event) => event.stopPropagation()}>
                          Openen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
