import { useState } from 'react'
import { Page } from '@/components/Page'
import { ApiError, request } from '@/lib/http'


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

        <WhoAmI />
      </Page>
    </main>
  )
}

function WhoAmI() {
  const [result, setResult] = useState('Not asked yet')
  const [pending, setPending] = useState(false)

  async function askServer() {
    setPending(true)
    try {
      const me = await request<unknown>('user', '/users/me')
      setResult(JSON.stringify(me, null, 2))
    } catch (error) {
      setResult(
        error instanceof ApiError ? `${error.status} ${error.code}: ${error.message}` : String(error),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="ds-surface grid gap-4 p-5">
      <h2>Session (request)</h2>
      <p className="text-muted">Calls GET /api/user/users/me through the gateway.</p>
      <div>
        <button type="button" className="ds-btn ds-btn--glass" onClick={askServer} disabled={pending}>
          {pending ? 'Asking…' : 'Who am I?'}
        </button>
      </div>
      <pre className="ds-surface ds-surface--sunken p-3 font-mono text-sm whitespace-pre-wrap wrap-anywhere">
        {result}
      </pre>
    </section>
  )
}