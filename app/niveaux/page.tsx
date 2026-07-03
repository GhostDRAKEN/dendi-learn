import Link from 'next/link'
import ThemeToggle from '../components/ThemeToggle'

const NIVEAUX = [
  { label: 'Débutant', slug: 'debutant', emoji: '🌱', desc: 'Salutations, couleurs, moments de la journée', couleur: '#4CAF50' },
  { label: 'Intermédiaire', slug: 'intermediaire', emoji: '🔥', desc: 'Verbes, prépositions, jours et mois', couleur: '#E07B39' },
  { label: 'Avancé', slug: 'avance', emoji: '⭐', desc: 'Corps humain, noms et adjectifs complexes', couleur: '#9C27B0' },
]

export default function NiveauxPage() {
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

      <section style={{ padding: '60px 5vw', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Choisir un niveau
        </p>
        <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text)', marginBottom: '40px' }}>
          Où en es-tu ?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          maxWidth: '700px',
          margin: '0 auto 40px',
        }}>
          {NIVEAUX.map((niveau) => (
            <Link key={niveau.slug} href={`/apprendre?niveau=${niveau.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderTop: `3px solid ${niveau.couleur}`,
                borderRadius: '16px',
                padding: '24px 16px',
                cursor: 'pointer',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>{niveau.emoji}</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: niveau.couleur, marginBottom: '6px' }}>{niveau.label}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{niveau.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/apprendre" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ou explorer librement →
        </Link>
      </section>
    </main>
  )
}