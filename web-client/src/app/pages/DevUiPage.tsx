const statusBadges = [
  { label: 'Open', className: 'ds-badge ds-badge--danger' },
  { label: 'Accepted', className: 'ds-badge ds-badge--info' },
  { label: 'Completed', className: 'ds-badge ds-badge--success' },
  { label: 'Cancelled', className: 'ds-badge ds-badge--neutral' },
]

export function DevUiPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-10 md:px-8">
      <header>
        <p className="ds-label">Development only</p>
        <h1 className="mt-2">Relay UI gallery</h1>
        <p className="mt-3 text-muted">
          Every shared component in every state. This page is left out of production builds.
        </p>
      </header>

      <section className="grid gap-4">
        <h2>Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="ds-btn ds-btn--primary">
            Primary
          </button>
          <button type="button" className="ds-btn ds-btn--glass">
            Glass
          </button>
          <button type="button" className="ds-btn ds-btn--text">
            Text
          </button>
          <button type="button" className="ds-btn ds-btn--primary" disabled>
            Disabled
          </button>
        </div>
      </section>

      <section className="grid gap-4">
        <h2>Status badges</h2>
        <div className="flex flex-wrap gap-3">
          {statusBadges.map((badge) => (
            <span key={badge.label} className={badge.className}>
              {badge.label}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}