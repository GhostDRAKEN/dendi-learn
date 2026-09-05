import Link from 'next/link'

export default function GuestProfile() {
  return (
    <div className="guest-profile">
      <svg className="guest-profile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20v-1c0-3.2 2.5-5 6.5-5s6.5 1.8 6.5 5v1" />
      </svg>
      <h2 id="guest-profile-title">Votre espace Dendi-Learn</h2>
      <p>Créez un compte pour sauvegarder votre progression et la retrouver sur vos appareils.</p>
      <ul>
        <li>Retrouver vos mots maîtrisés</li>
        <li>Continuer à apprendre sur un autre appareil</li>
      </ul>
      <div className="guest-profile-actions">
        <Link href="/inscription" className="profile-primary-action">Créer mon compte</Link>
        <Link href="/connexion" className="profile-secondary-action">J’ai déjà un compte</Link>
      </div>
    </div>
  )
}
