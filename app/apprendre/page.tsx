import { supabase } from '@/lib/supabase'
import QuizWrapper from '../components/QuizWrapper'
import ThemeToggle from '../components/ThemeToggle'
import ApprendreClient from '../components/ApprendreClient'
import Link from 'next/link'

export default async function ApprendrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string, niveau?: string }>
}) {
  const params = await searchParams

  let query = supabase.from('mots').select('*')
  if (params.niveau) {
    query = query.eq('niveau', params.niveau)
  }

  const { data: mots, error } = await query

  if (error) return <p>Erreur : {error.message}</p>

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header style={{ padding: '16px 5vw', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
              Dendi Learn{' '}
              <span style={{ fontSize: '11px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Langue du nord Bénin
              </span>
            </h1>
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ThemeToggle />
            <QuizWrapper mots={mots ?? []} />
          </div>
        </div>
      </header>

      {params.niveau && (
        <div style={{ padding: '12px 5vw', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Niveau :{' '}
            <span style={{ color: params.niveau === 'debutant' ? '#4CAF50' : params.niveau === 'intermediaire' ? '#E07B39' : '#9C27B0', fontWeight: '600' }}>
              {params.niveau === 'debutant' ? '🌱 Débutant' : params.niveau === 'intermediaire' ? '🔥 Intermédiaire' : '⭐ Avancé'}
            </span>
            {' · '}
            <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Changer</Link>
          </p>
        </div>
      )}

      <section style={{ padding: '24px 5vw' }}>
        <ApprendreClient mots={mots ?? []} categorieInitiale={params.categorie} />
      </section>
    </main>
  )
}