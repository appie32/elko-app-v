import Link from 'next/link'

export default function TopNav() {
  return (
    <div style={{
      background: '#111827',
      color: 'white',
      padding: '14px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }}>
      <Link href="/dashboard" style={{ fontWeight: 800 }}>ELKO App</Link>
      <nav className="row">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/customers">Klanten</Link>
        <Link href="/projects/new">Nieuw project</Link>
        <Link href="/appointments">Planning</Link>
      </nav>
    </div>
  )
}
