import AppHeader from '../components/AppHeader'

export default function ProfileLoading() {
  return (
    <main className="profile-page">
      <AppHeader page="profil" />
      <section className="profile-content" aria-label="Espace personnel" aria-busy="true">
        <div className="guest-profile" role="status">Chargement de votre espace…</div>
      </section>
    </main>
  )
}
