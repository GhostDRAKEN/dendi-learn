export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="site-footer-brand">Dendi Learn</p>
          <p className="site-footer-description">
            Projet open source dédié à l’apprentissage du Dendi.
          </p>
        </div>
        <a
          href="https://github.com/GhostDRAKEN/dendi-learn"
          target="_blank"
          rel="noreferrer"
          className="site-footer-link"
          aria-label="Voir le dépôt GitHub de Dendi Learn"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  )
}
