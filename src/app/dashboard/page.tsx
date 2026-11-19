'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { workflowStage } from '@/lib/workflow'

type ProjectRow = {
  id: string
  project_name: string
  city: string
  status: string
  quote_status: string
  customers?: { customer_name: string } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Alles')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error: queryError } = await supabase.from('projects')
        .select('id, project_name, city, status, quote_status, customers(customer_name)')
        .order('created_at', { ascending: false }).limit(300)
      if (!mounted) return
      setLoading(false)
      if (queryError) setError(`Projecten konden niet worden geladen: ${queryError.message}`)
      else setProjects((data || []) as ProjectRow[])
    }
    load()
    return () => { mounted = false }
  }, [])

  const groups = [
    { label: 'Nieuwe aanvragen', stage: 0 },
    { label: 'Inmeten', stage: 1 },
    { label: 'Offertes', stage: 2 },
    { label: 'Bestellingen', stage: 3 },
    { label: 'Montage', stage: 4 },
  ]
  const counts = groups.map(group=>projects.filter(p=>workflowStage(p.status)===group.stage).length)
  const shown = filter === 'Alles' ? projects.slice(0,12) : projects.filter(p=>workflowStage(p.status)===groups.find(g=>g.label===filter)?.stage).slice(0,12)

  return (
    <>
      <div className="card">
        <h1>ELKO Solutions — dashboard</h1>
        <p className="muted">Start een nieuwe aanvraag en doorloop daarna de inmeting, offerte, bestelling en montage.</p>
        <div className="row">
          <Link className="button" href="/projects/new">+ Nieuwe aanvraag / project</Link>
          <Link className="button secondary" href="/customers/new">Nieuwe klant</Link>
          <Link className="button secondary" href="/appointments">Inmeet- en montageplanning</Link>
          <Link className="button secondary" href="/quotes">Offertes</Link>
        </div>
      </div>

      <div className="card">
        <h2>Werkvoorraad per fase</h2>
        <p className="muted">Overzicht van de geladen projecten. Klik op een fase om de bijbehorende projecten te tonen.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(128px,1fr))',gap:10}}>
          {groups.map((group,index)=><button key={group.label} type="button" onClick={()=>setFilter(group.label)}
            style={{cursor:'pointer',padding:14,borderRadius:12,textAlign:'left',border:`1px solid ${filter===group.label?'#B89B5E':'#ded9d1'}`,background:filter===group.label?'#f5ead9':'#fbfaf8',color:'#203347'}}>
            <div style={{fontSize:11}}>{group.label}</div>
            <div style={{fontSize:24,fontWeight:700,marginTop:5}}>{counts[index]}</div>
          </button>)}
        </div>
        {filter!=='Alles'&&<button className="button secondary" style={{marginTop:12}} onClick={()=>setFilter('Alles')}>Alle projecten tonen</button>}
      </div>

      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div><h2>{filter==='Alles'?'Recente projecten':filter}</h2><p className="muted">Klik op een project om verder te werken.</p></div>
          <Link href="/projects">Alle projecten en zoeken</Link>
        </div>
        {loading && <p className="muted" role="status">Projecten laden...</p>}
        {error && <p role="alert" style={{color:'#9c2424'}}>{error} <Link href="/login">Opnieuw inloggen</Link></p>}
        {!loading&&!error&&shown.length===0&&<p>Geen projecten in deze fase.</p>}
        {!loading&&!error&&shown.length>0&&<div style={{overflowX:'auto'}}><table className="table">
          <thead><tr><th>Klant</th><th>Project</th><th>Plaats</th><th>Status</th><th></th></tr></thead>
          <tbody>{shown.map(p=><tr key={p.id} role="link" tabIndex={0} style={{cursor:'pointer'}}
            onClick={()=>router.push(`/projects/${p.id}`)} onKeyDown={e=>{if(e.key==='Enter'){router.push(`/projects/${p.id}`)}}}>
            <td>{p.customers?.customer_name || '-'}</td><td><strong>{p.project_name}</strong></td>
            <td>{p.city}</td><td>{p.status}</td>
            <td><Link href={`/projects/${p.id}`} onClick={e=>e.stopPropagation()}>Openen</Link></td>
          </tr>)}</tbody>
        </table></div>}
      </div>
    </>
  )
}
