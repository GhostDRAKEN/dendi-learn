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

  const { data: mots } = await supabase.from('mots').select('id, fr, categorie, niveau')

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <section style={{ padding: '40px 5vw' }}>
        <ProfilClient
          mots={mots ?? []}
          user={{ id: user.id, email: user.email ?? '' }}
        />
      </section>
    </main>
  )
}
