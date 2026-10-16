import { useState } from 'react'
import { useSession } from '@/api/user/session'
import { Page } from '@/components/Page'
import { ApiError, request } from '@/lib/http'
import { LoadingState } from '@/components/LoadingState'


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
        <section className="ds-surface grid grid-cols-1 gap-4 p-5">
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

        <section className="ds-surface grid grid-cols-1 gap-4 p-5">
          <h2>Long content (N5.1)</h2>
          <p className="text-muted">Nothing here may push the page wider than the screen.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="ds-btn ds-btn--primary">
              A very long button label that has to wrap on a small phone
            </button>
          </div>
          <p>e0123456789.with.a.very.long.name.that.does.not.fit@u.nus.edu</p>
          <div className="ds-segmented">
            <button type="button" aria-pressed="true">All</button>
            <button type="button">Stores</button>
            <button type="button">Facilities</button>
            <button type="button">Landmarks</button>
            <button type="button">Printers</button>
          </div>
        </section>


        <section className="ds-surface grid grid-cols-1 gap-4 p-5">
          <h2>Status badges</h2>
          <div className="flex flex-wrap gap-3">
            {statusBadges.map((badge) => (
              <span key={badge.label} className={badge.className}>
                {badge.label}
              </span>
            ))}
          </div>
        </section>

        <SessionDemo />

        <section className="grid grid-cols-1 gap-4">
          <h2>Loading state</h2>
          <LoadingState label="Loading suppliers" />
          <LoadingState label="Loading errands" rows={5} />
        </section>

        <ErrorCases />
      </Page>
    </main>
  )
}

function SessionDemo() {
  const session = useSession()

  let status: string
  if (session.isPending) status = 'Loading…'
  else if (session.isError) status = `Error: ${session.error.message}`
  else if (session.data === null) status = 'Guest (not logged in)'
  else status = `Logged in as ${session.data.username} (${session.data.roles.join(', ')})`

  return (
    <section className="ds-surface grid grid-cols-1 gap-4 p-5">
      <h2>Session (useSession)</h2>
      <p className="text-muted">Asks GET /api/user/users/me once and keeps the answer in the cache.</p>
      <p>
        <strong>{status}</strong>
      </p>
      <div>
        <button
          type="button"
          className="ds-btn ds-btn--glass"
          onClick={() => session.refetch()}
          disabled={session.isFetching}
        >
          {session.isFetching ? 'Fetching…' : 'Refetch'}
        </button>
      </div>
    </section>
  )
}

const errorCases = [
  {
    label: 'Invalid sign-up',
    run: () =>
      request('user', '/auth/register', {
        method: 'POST',
        body: { fullName: 'Gallery Demo', email: 'demo@gmail.com', username: 'gallery-demo', password: 'short' },
      }),
  },
  {
    label: 'Unknown API route',
    run: () => request('user', '/does-not-exist'),
  },
  {
    label: 'Invalid supplier (log in as admin first)',
    run: () => request('supplier', '/suppliers', { method: 'POST', body: { name: '' } }),
  },
]

function ErrorCases() {
  const [result, setResult] = useState('Pick a case')

  async function show(run: () => Promise<unknown>) {
    try {
      await run()
      setResult('No error')
    } catch (error) {
      if (error instanceof ApiError) {
        const { status, code, message, fieldErrors } = error
        setResult(JSON.stringify({ status, code, message, fieldErrors }, null, 2))
      } else {
        setResult(String(error))
      }
    }
  }

  return (
    <section className="ds-surface grid grid-cols-1 gap-4 p-5">
      <h2>Error handling (ApiError)</h2>
      <p className="text-muted">Each button triggers a refused request. Nothing is created.</p>
      <div className="flex flex-wrap gap-3">
        {errorCases.map((errorCase) => (
          <button
            key={errorCase.label}
            type="button"
            className="ds-btn ds-btn--glass"
            onClick={() => show(errorCase.run)}
          >
            {errorCase.label}
          </button>
        ))}
      </div>
      <pre className="ds-surface ds-surface--sunken p-3 font-mono text-sm whitespace-pre-wrap wrap-anywhere">
        {result}
      </pre>
    </section>
  )
}