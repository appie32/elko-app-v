import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="card">
      <h1>ELKO App v1</h1>
      <p className="muted">Interne inmeet- en offerteapp.</p>
      <div className="row">
        <Link className="button" href="/dashboard">Naar dashboard</Link>
        <Link className="button secondary" href="/login">Inloggen</Link>
      </div>
    </div>
  )
}
