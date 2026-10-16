import { Page } from '@/components/Page'

const statusBadges = [
  { label: 'Open', className: 'ds-badge ds-badge--danger' },
  { label: 'Accepted', className: 'ds-badge ds-badge--info' },
  { label: 'Completed', className: 'ds-badge ds-badge--success' },
  { label: 'Cancelled', className: 'ds-badge ds-badge--neutral' },
]

export function DevUiPage() {
  return (
    <main>
      <Page
        title="Relay UI gallery"
        subtitle="Every shared component in every state. Left out of production builds."
        actions={<span className="ds-badge ds-badge--neutral">Dev only</span>}
      >
        <section className="ds-surface grid gap-4 p-5">
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

        <section className="ds-surface grid gap-4 p-5">
          <h2>Status badges</h2>
          <div className="flex flex-wrap gap-3">
            {statusBadges.map((badge) => (
              <span key={badge.label} className={badge.className}>
                {badge.label}
              </span>
            ))}
          </div>
        </section>
      </Page>
    </main>
  )
}