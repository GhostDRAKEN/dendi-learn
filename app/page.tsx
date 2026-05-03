import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: mots, error } = await supabase
    .from('mots')
    .select('*')

  if (error) {
    return <p>Erreur : {error.message}</p>
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dendi Learn</h1>
      <ul className="space-y-4">
        {mots?.map((mot) => (
          <li key={mot.id} className="border p-4 rounded-lg">
            <p className="text-xl font-semibold">{mot.fr}</p>
            <p className="text-gray-600">{mot.dendi}</p>
            <p className="text-gray-400 italic">{mot.phonetique}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}