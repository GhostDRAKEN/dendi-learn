import { supabase } from '@/lib/supabase'
import Filtre from '../components/Filtre'
import QuizWrapper from '../components/QuizWrapper'
import ThemeToggle from '../components/ThemeToggle'
import Link from 'next/link'

export default async function ApprendrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>
}) {
  const params = await searchParams
  const { data: mots, error } = await supabase
    .from('mots')
    .select('*')

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
      <section style={{ padding: '24px 5vw' }}>
        <Filtre mots={mots ?? []} categorieInitiale={params.categorie} />
      </section>
    </main>
  )
}
