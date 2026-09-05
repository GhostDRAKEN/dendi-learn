import { createClient } from '@/lib/supabase/server'
import AppHeader from '../components/AppHeader'
import ProfilClient from '../components/ProfilClient'
import GuestProfile from '../components/GuestProfile'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return (
      <main className="profile-page">
        <AppHeader page="profil" />
        <section className="profile-content" aria-labelledby="guest-profile-title">
          <GuestProfile />
        </section>
      </main>
    )
  }

  const { data: mots, error: motsError } = await supabase.from('mots').select('id, fr, categorie, niveau')

  return (
    <main className="profile-page">
      <AppHeader page="profil" />
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
