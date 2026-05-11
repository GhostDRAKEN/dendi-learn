'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mot = {
  id: number
  fr: string
  categorie: string
  niveau: string
}

type Progression = {
  mot_id: number
  vu: boolean
  maitrise: boolean
}

export default function ProfilClient({ mots }: { mots: Mot[] }) {
  const [user, setUser] = useState<any>(null)
  const [progression, setProgression] = useState<Progression[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/connexion')
        return
      }
      setUser(data.user)

      const { data: prog } = await supabase
        .from('progression')
        .select('mot_id, vu, maitrise')
        .eq('user_id', data.user.id)

      setProgression(prog ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Chargement...</p>
  }

  const vusIds = new Set(progression.filter(p => p.vu).map(p => p.mot_id))
  const maitriseIds = new Set(progression.filter(p => p.maitrise).map(p => p.mot_id))

  const totalMots = mots.length
  const totalVus = vusIds.size
  const totalMaitrises = maitriseIds.size
  const progressionGlobale = Math.round((totalVus / totalMots) * 100)

  const parNiveau = ['debutant', 'intermediaire', 'avance'].map(niveau => {
    const motsDuNiveau = mots.filter(m => m.niveau === niveau)
    const vus = motsDuNiveau.filter(m => vusIds.has(m.id)).length
    return { niveau, total: motsDuNiveau.length, vus }
  })

  const niveauLabels: Record<string, { label: string, emoji: string, couleur: string }> = {
    debutant: { label: 'Débutant', emoji: '🌱', couleur: '#4CAF50' },
    intermediaire: { label: 'Intermédiaire', emoji: '🔥', couleur: '#E07B39' },
    avance: { label: 'Avancé', emoji: '⭐', couleur: '#9C27B0' },
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* En-tête profil */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '64px', height: '64px',
          backgroundColor: '#E07B39',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '24px', fontWeight: '700', color: 'white',
        }}>
          {user?.email?.[0]?.toUpperCase()}
        </div>
        <p style={{ color: 'var(--text)', fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
          {user?.email}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Membre Dendi Learn
        </p>
      </div>

      {/* Stats globales */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px', marginBottom: '32px',
      }}>
        {[
          { label: 'Mots vus', value: totalVus, total: totalMots },
          { label: 'Maîtrisés', value: totalMaitrises, total: totalMots },
          { label: 'Progression', value: `${progressionGlobale}%`, total: null },
        ].map((stat) => (
          <div key={stat.label} style={{
            backgroundColor: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '20px 12px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#E07B39', marginBottom: '4px' }}>
              {stat.value}
            </p>
            {stat.total && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                sur {stat.total}
              </p>
            )}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progression par niveau */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Progression par niveau
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {parNiveau.map(({ niveau, total, vus }) => {
            const info = niveauLabels[niveau]
            const pct = total > 0 ? Math.round((vus / total) * 100) : 0
            return (
              <div key={niveau} style={{
                backgroundColor: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: info.couleur, fontSize: '14px', fontWeight: '600' }}>
                    {info.emoji} {info.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {vus} / {total}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: info.couleur, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/apprendre" style={{
          padding: '12px 24px', borderRadius: '9999px',
          backgroundColor: '#E07B39', color: 'white',
          textDecoration: 'none', fontSize: '14px',
          fontFamily: 'Georgia, serif', fontWeight: '600',
        }}>
          Continuer à apprendre
        </Link>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          style={{
            padding: '12px 24px', borderRadius: '9999px',
            backgroundColor: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: '14px',
            cursor: 'pointer', fontFamily: 'Georgia, serif',
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}