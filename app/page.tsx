import { supabase } from '@/lib/supabase'
import Filtre from './components/Filtre'
import QuizWrapper from './components/QuizWrapper'

export default async function Home() {
  const { data: mots, error } = await supabase
    .from('mots')
    .select('*')

  if (error) {
    return <p>Erreur : {error.message}</p>
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header style={{ padding: '24px 5vw 20px', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#F5F0EB' }}>
              Dendi Learn{' '}
              <span style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Langue du nord Bénin
              </span>
            </h1>
          </div>
          <QuizWrapper mots={mots ?? []} />
        </div>
      </header>
      <section style={{ padding: '24px 5vw' }}>
        <Filtre mots={mots ?? []} />
      </section>
    </main>
  )
}