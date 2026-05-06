import { supabase } from '@/lib/supabase'
import Filtre from './components/Filtre'

export default async function Home() {
  const { data: mots, error } = await supabase
    .from('mots')
    .select('*')

  if (error) {
    return <p style={{ color: 'red', padding: '32px' }}>Erreur : {error.message}</p>
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      <header style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #2A2A2A',
        display: 'flex',
        alignItems: 'baseline',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <h1 style={{
          color: '#F5F0EB',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: '700',
          fontFamily: 'Georgia, serif',
        }}>
          Dendi Learn
        </h1>
        <p style={{
          color: '#E07B39',
          fontSize: '12px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          Langue du nord Bénin
        </p>
      </header>

     <section style={{ padding: '20px clamp(16px, 4vw, 32px)' }}>
        <Filtre mots={mots ?? []} />
      </section>
    </main>
  )
}