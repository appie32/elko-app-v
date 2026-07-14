'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function login() {
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="card">
      <h1>Inloggen</h1>
      <div className="grid">
        <label>
          E-mailadres
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Wachtwoord
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button onClick={login}>Inloggen</button>
        {message && <p className="muted">{message}</p>}
      </div>
    </div>
  )
}
