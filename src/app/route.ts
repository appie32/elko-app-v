import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="card brand-hero">
      <h1>Elko App</h1>
      <p className="muted">Interne inmeet- en offerteapp voor Elko Horren.</p>
      <div className="row">
        <Link className="button" href="/dashboard">Naar dashboard</Link>
        <Link className="button secondary" href="/login">Inloggen</Link>
      </div>
    </div>
  )
}
