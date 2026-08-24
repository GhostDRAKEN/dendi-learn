import { createClient } from '@/lib/supabase/server'
import QuizWrapper from '../components/QuizWrapper'
import AppHeader from '../components/AppHeader'
import ApprendreClient from '../components/ApprendreClient'
import Link from 'next/link'

export default async function ApprendrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string, niveau?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  let query = supabase.from('mots').select('*')
  if (params.niveau) {
    query = query.eq('niveau', params.niveau)
  }

  const { data: mots, error } = await query

  if (error) return <p>Erreur : {error.message}</p>

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader actions={<QuizWrapper mots={mots ?? []} />} />

      {params.niveau && (
        <div style={{ padding: '12px 5vw', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Niveau :{' '}
            <span style={{ color: params.niveau === 'debutant' ? '#4CAF50' : params.niveau === 'intermediaire' ? '#E07B39' : '#9C27B0', fontWeight: '600' }}>
              {params.niveau === 'debutant' ? '🌱 Débutant' : params.niveau === 'intermediaire' ? '🔥 Intermédiaire' : '⭐ Avancé'}
            </span>
            {' · '}
            <Link href="/niveaux" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Changer</Link>
          </p>
        </div>
      )}

      <section style={{ padding: '24px 5vw' }}>
        <ApprendreClient mots={mots ?? []} categorieInitiale={params.categorie} niveau={params.niveau} />
      </section>
    </main>
  )
}
