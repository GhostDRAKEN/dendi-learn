'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mot = {
  id: number
  fr: string
  categorie: string
  niveau: string
}

type Progression = {
  mot_id: number
  vu: boolean
  maitrise: boolean
}

type ProfilUser = {
  id: string
  email: string
}

export default function ProfilClient({ mots, user, motsError = false }: { mots: Mot[], user: ProfilUser, motsError?: boolean }) {
  const [progression, setProgression] = useState<Progression[]>([])
  const [loading, setLoading] = useState(true)
  const [progressionError, setProgressionError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let actif = true

    const chargerProgression = async () => {
      const { data: prog, error } = await supabase
        .from('progression')
        .select('mot_id, vu, maitrise')
        .eq('user_id', user.id)

      if (!actif) return

      if (error) {
        setProgressionError(true)
        setLoading(false)
        return
      }

      setProgression(prog ?? [])
      setLoading(false)
    }

    chargerProgression()

    return () => {
      actif = false
    }
  }, [user.id])

  const vusIds = new Set(progression.filter(p => p.vu).map(p => p.mot_id))
  const maitriseIds = new Set(progression.filter(p => p.maitrise).map(p => p.mot_id))

  const totalMots = mots.length
  const totalVus = vusIds.size
  const totalMaitrises = maitriseIds.size
  const progressionGlobale = totalMots > 0 ? Math.round((totalVus / totalMots) * 100) : 0

  const parNiveau = ['debutant', 'intermediaire', 'avance'].map(niveau => {
    const motsDuNiveau = mots.filter(m => m.niveau === niveau)
    const vus = motsDuNiveau.filter(m => vusIds.has(m.id)).length
    return { niveau, total: motsDuNiveau.length, vus }
  })

  const niveauLabels: Record<string, { label: string, emoji: string }> = {
    debutant: { label: 'Débutant', emoji: '🌱' },
    intermediaire: { label: 'Intermédiaire', emoji: '🔥' },
    avance: { label: 'Avancé', emoji: '⭐' },
  }

  return (
    <div className="profile-shell">
      <header className="profile-intro">
        <div className="profile-avatar" aria-hidden="true">
          {user.email[0]?.toUpperCase() || 'D'}
        </div>
        <div>
          <p className="profile-eyebrow">Espace personnel</p>
          <h2 id="profile-title" className="profile-title">Ma progression</h2>
          <p className="profile-description">
            Retrouvez les mots que vous avez explorés et maîtrisés dans Dendi Learn.
          </p>
          <p className="profile-email">{user.email}</p>
        </div>
      </header>

      {loading ? (
        <div className="profile-loading" role="status" aria-live="polite">
          <p className="profile-loading-label">Chargement de votre progression…</p>
          <div className="profile-skeleton-grid" aria-hidden="true">
            {[0, 1, 2, 3].map(item => <div key={item} className="profile-skeleton-card" />)}
          </div>
          <div className="profile-skeleton-panel" aria-hidden="true" />
        </div>
      ) : progressionError || motsError ? (
        <section className="profile-message profile-error" role="alert">
          <span className="profile-message-icon" aria-hidden="true">!</span>
          <div>
            <h3>Progression indisponible</h3>
            <p>Impossible de charger votre progression pour le moment. Votre profil reste accessible.</p>
          </div>
        </section>
      ) : (
        <>
          <dl className="profile-stats" aria-label="Statistiques globales">
            <div className="profile-stat-card">
              <dt>Mots vus</dt>
              <dd>{totalVus}</dd>
            </div>
            <div className="profile-stat-card">
              <dt>Mots maîtrisés</dt>
              <dd>{totalMaitrises}</dd>
            </div>
            <div className="profile-stat-card">
              <dt>Mots disponibles</dt>
              <dd>{totalMots}</dd>
            </div>
            <div className="profile-stat-card profile-stat-highlight">
              <dt>Progression globale</dt>
              <dd>{totalMots > 0 ? `${progressionGlobale}%` : '—'}</dd>
            </div>
          </dl>

          <section className="profile-section" aria-labelledby="global-progress-title">
            <div className="profile-section-heading">
              <div>
                <p className="profile-section-eyebrow">Vue d’ensemble</p>
                <h3 id="global-progress-title">Progression globale</h3>
              </div>
              {totalMots > 0 && <strong>{progressionGlobale}%</strong>}
            </div>

            {totalMots > 0 ? (
              <>
                <div
                  className="profile-progress-track"
                  role="progressbar"
                  aria-label={`${totalVus} mots vus sur ${totalMots}`}
                  aria-valuemin={0}
                  aria-valuemax={totalMots}
                  aria-valuenow={totalVus}
                >
                  <div className="profile-progress-value" style={{ width: `${progressionGlobale}%` }} />
                </div>
                <p className="profile-progress-caption">{totalVus} mots vus sur {totalMots}</p>
              </>
            ) : (
              <p className="profile-neutral-state">
                Aucun mot n’est disponible pour calculer votre progression.
              </p>
            )}
          </section>

          {totalMots > 0 && (
            <section className="profile-section" aria-labelledby="level-progress-title">
              <div className="profile-section-heading">
                <div>
                  <p className="profile-section-eyebrow">Votre parcours</p>
                  <h3 id="level-progress-title">Progression par niveau</h3>
                </div>
              </div>
              <div className="profile-levels">
                {parNiveau.map(({ niveau, total, vus }) => {
                  const info = niveauLabels[niveau]
                  const pct = total > 0 ? Math.round((vus / total) * 100) : 0

                  return (
                    <article key={niveau} className={`profile-level profile-level-${niveau}`}>
                      <div className="profile-level-heading">
                        <h4>{info.emoji} {info.label}</h4>
                        <span>{total > 0 ? `${vus} / ${total}` : 'Aucun mot'}</span>
                      </div>
                      {total > 0 && (
                        <div
                          className="profile-level-track"
                          role="progressbar"
                          aria-label={`Niveau ${info.label} : ${vus} mots vus sur ${total}`}
                          aria-valuemin={0}
                          aria-valuemax={total}
                          aria-valuenow={vus}
                        >
                          <div className="profile-level-value" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {totalMots > 0 && totalVus === 0 && (
            <section className="profile-message profile-empty">
              <span className="profile-message-icon" aria-hidden="true">→</span>
              <div>
                <h3>Votre apprentissage commence ici</h3>
                <p>Choisissez un niveau pour découvrir vos premiers mots en Dendi.</p>
                <Link href="/niveaux" className="profile-inline-link">Choisir un niveau</Link>
              </div>
            </section>
          )}
        </>
      )}

      <div className="profile-actions">
        <Link href="/parcours" className="profile-primary-action">
          Continuer à apprendre
        </Link>
        <button
          type="button"
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="profile-secondary-action"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}
