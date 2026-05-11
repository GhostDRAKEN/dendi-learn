import { supabase } from '@/lib/supabase'
import ThemeToggle from '../components/ThemeToggle'
import Link from 'next/link'
import ProfilClient from '../components/ProfilClient'

export default async function ProfilPage() {
  const { data: mots } = await supabase.from('mots').select('id, fr, categorie, niveau')

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <header style={{ padding: '16px 5vw', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
              Dendi Learn{' '}
              <span style={{ fontSize: '11px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Langue du nord Bénin
              </span>
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <section style={{ padding: '40px 5vw' }}>
        <ProfilClient mots={mots ?? []} />
      </section>
    </main>
  )
}