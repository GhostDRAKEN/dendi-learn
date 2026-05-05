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
        padding: '40px 32px',
        borderBottom: '1px solid #2A2A2A',
      }}>
        <p style={{
          color: '#E07B39',
          fontSize: '13px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Langue Dendi · Bénin
        </p>
        <h1 style={{
          color: '#F5F0EB',
          fontSize: '52px',
          fontWeight: '700',
          fontFamily: 'Georgia, serif',
        }}>
          Dendi Learn
        </h1>
        <p style={{
          color: '#A89A8A',
          fontSize: '16px',
          marginTop: '8px',
        }}>
          Apprenez le Dendi, langue du nord Bénin
        </p>
      </header>

      <section style={{ padding: '32px' }}>
        <Filtre mots={mots ?? []} />
      </section>
    </main>
  )
}