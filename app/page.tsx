import Link from 'next/link'
import ThemeToggle from './components/ThemeToggle'

const MOT_DU_JOUR = {
  fr: 'Bonjour',
  dendi: 'Fɔɔ nna suba !',
  phonetique: 'Fo nna souba !',
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px 5vw', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
            Dendi Learn{' '}
            <span style={{ fontSize: '11px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Langue du nord Bénin
            </span>
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 5vw', textAlign: 'center' }}>

        <p style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Première plateforme numérique
        </p>

        <h2 style={{ fontSize: '48px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.1 }}>
          Fɔɔ nna suba !
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '48px' }}>
          Bienvenue — Apprenez le Dendi, langue du nord Bénin
        </p>

        {/* Mot du jour */}
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid #E07B39',
          borderRadius: '20px',
          padding: '28px 48px',
          marginBottom: '48px',
          minWidth: '280px',
        }}>
          <p style={{ fontSize: '11px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Mot du jour
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#E07B39', marginBottom: '6px' }}>
            {MOT_DU_JOUR.dendi}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
            {MOT_DU_JOUR.phonetique}
          </p>
          <div style={{ width: '30px', height: '1px', backgroundColor: 'var(--border)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '18px', color: 'var(--text)', fontWeight: '600' }}>
            {MOT_DU_JOUR.fr}
          </p>
        </div>

        {/* CTA unique */}
        <Link href="/apprendre?niveau=debutant" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px 32px',
          backgroundColor: '#E07B39', color: 'white',
          borderRadius: '9999px', textDecoration: 'none',
          fontSize: '15px', fontWeight: '600', fontFamily: 'Georgia, serif',
          textAlign: 'center',
        }}>
          🌱 Commencer par le début
        </Link>

      </section>

      {/* Footer discret */}
      <footer style={{ padding: '20px 5vw', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <Link href="/apprendre" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Explorer librement</Link>
          {' · '}
          <Link href="/connexion" style={{ color: '#E07B39', textDecoration: 'none' }}>Connexion</Link>
          {' · '}
          <Link href="/inscription" style={{ color: '#E07B39', textDecoration: 'none' }}>Créer un compte</Link>
        </p>
      </footer>
    </main>
  )
}