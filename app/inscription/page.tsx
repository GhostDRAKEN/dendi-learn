'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleInscription = async () => {
    if (!email || !password) {
      setError('Remplis tous les champs.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '40px 32px',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>
            ← Dendi Learn
          </p>
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
          Créer un compte
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Sauvegarde ta progression et suis ton apprentissage.
        </p>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '16px' }}>📧</p>
            <p style={{ color: 'var(--text)', fontWeight: '600', marginBottom: '8px' }}>Vérifie ta boîte mail</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Un lien de confirmation t'a été envoyé à {email}.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                style={{
                  width: '100%', padding: '12px 16px',
                  borderRadius: '12px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--input-bg)', color: 'var(--text)',
                  fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                style={{
                  width: '100%', padding: '12px 16px',
                  borderRadius: '12px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--input-bg)', color: 'var(--text)',
                  fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#F44336', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
            )}

            <button
              onClick={handleInscription}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                backgroundColor: '#E07B39', border: 'none',
                borderRadius: '12px', color: 'white',
                fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Georgia, serif',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Déjà un compte ?{' '}
              <Link href="/connexion" style={{ color: '#E07B39', textDecoration: 'none' }}>
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}