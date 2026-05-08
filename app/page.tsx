import Link from 'next/link'
import ThemeToggle from './components/ThemeToggle'

const CATEGORIES = [
  { label: 'Salutations', slug: 'Salutations', emoji: '👋', desc: 'Bonjour, merci, au revoir...' },
  { label: 'Corps humain', slug: 'corps', emoji: '🫀', desc: 'Tête, main, pied...' },
  { label: 'Verbes', slug: 'verbes', emoji: '⚡', desc: 'Manger, dormir, parler...' },
  { label: 'Prépositions', slug: 'prepositions', emoji: '📍', desc: 'Dedans, devant, à côté...' },
  { label: 'Noms & Adjectifs', slug: 'noms', emoji: '🏠', desc: 'Maison, sage, courageux...' },
  { label: 'Couleurs', slug: 'couleurs', emoji: '🎨', desc: 'Rouge, bleu, vert...' },
  { label: 'Temps', slug: 'temps', emoji: '🕐', desc: 'Jours, mois, matin, soir...' },
]

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
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
      <section style={{ padding: '60px 5vw 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Première plateforme numérique
        </p>
        <h2 style={{ fontSize: '40px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', lineHeight: 1.2 }}>
          Apprenez le Dendi
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          La langue du nord Bénin, désormais accessible à tous. Cartes interactives, quiz, et recherche de mots.
        </p>
        <Link href="/apprendre" style={{
          display: 'inline-block',
          padding: '14px 32px',
          backgroundColor: '#E07B39',
          color: 'white',
          borderRadius: '9999px',
          textDecoration: 'none',
          fontSize: '15px',
          fontWeight: '600',
          fontFamily: 'Georgia, serif',
        }}>
          Commencer →
        </Link>
      </section>

      {/* Catégories */}
      <section style={{ padding: '20px 5vw 60px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center' }}>
          Choisir une catégorie
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/apprendre?categorie=${cat.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px 16px',
                cursor: 'pointer',
              }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>{cat.emoji}</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>{cat.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
