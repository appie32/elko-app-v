'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/lib/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      setCustomers((data || []) as Customer[])
    }

    load()
  }, [])

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Klanten</h1>
          <p className="muted">Alle klanten in de app.</p>
        </div>
        <Link className="button" href="/customers/new">Klant toevoegen</Link>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Naam</th>
            <th>Plaats</th>
            <th>Telefoon</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.customer_name}</td>
              <td>{customer.city}</td>
              <td>{customer.phone}</td>
              <td><Link href={`/customers/${customer.id}`}>Openen</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
