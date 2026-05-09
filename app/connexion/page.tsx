'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleConnexion = async () => {
    if (!email || !password) { setError('Remplis tous les champs.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    router.push('/apprendre')
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 32px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>← Dendi Learn</p>
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Se connecter</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Retrouve ta progression et continue d'apprendre.</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ton mot de passe"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: '#F44336', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button onClick={handleConnexion} disabled={loading}
          style={{ width: '100%', padding: '14px', backgroundColor: '#E07B39', border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Pas encore de compte ?{' '}
          <Link href="/inscription" style={{ color: '#E07B39', textDecoration: 'none' }}>S'inscrire</Link>
        </p>
      </div>
    </main>
  )
}
