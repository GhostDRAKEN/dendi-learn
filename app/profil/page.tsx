import { createClient } from '@/lib/supabase/server'
import AppHeader from '../components/AppHeader'
import ProfilClient from '../components/ProfilClient'
import { redirect } from 'next/navigation'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/connexion')
  }

  const { data: mots, error: motsError } = await supabase.from('mots').select('id, fr, categorie, niveau')

  return (
    <main className="profile-page">
      <AppHeader />
      <section className="profile-content" aria-labelledby="profile-title">
        <ProfilClient
          mots={mots ?? []}
          user={{ id: user.id, email: user.email ?? '' }}
          motsError={Boolean(motsError)}
        />
      </section>
    </main>
  )
}
