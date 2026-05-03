import { supabase } from '@/lib/supabase'
import MotCard from './components/MotCard'

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {mots?.map((mot) => (
          <MotCard key={mot.id} mot={mot} />
        ))}
      </div>
    </main>
  )
}