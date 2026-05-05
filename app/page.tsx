import { supabase } from '@/lib/supabase'
import Filtre from './components/Filtre'

export default async function Home() {
  const { data: mots, error } = await supabase
    .from('mots')
    .select('*')

  if (error) {
    return <p>Erreur : {error.message}</p>
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header className="px-8 py-10 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm tracking-widest uppercase mb-1" style={{ color: 'var(--accent)' }}>
          Langue Dendi · Bénin
        </p>
        <h1 className="text-4xl font-bold" style={{ color: 'var(--text)' }}>
          Dendi Learn
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Apprenez le Dendi, langue du nord Bénin
        </p>
      </header>
      <section className="px-8 py-8">
        <Filtre mots={mots ?? []} />
      </section>
    </main>
  )
}