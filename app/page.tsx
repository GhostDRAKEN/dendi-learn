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
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dendi Learn</h1>
      <Filtre mots={mots ?? []} />
    </main>
  )
}