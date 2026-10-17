import { Navigate, Outlet, useLocation } from 'react-router'
import type { Location } from 'react-router'
import { useSession } from '@/api/user/session'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'

// Signed-out pages only. A logged-in user is sent on: back to the page that sent them to the
// login (state.from), or to the start. This is the only place that redirects after a login.
export function RequireGuest() {
  const session = useSession()
  const location = useLocation()

  if (session.data === undefined) {
    if (session.isError && !session.isFetching) {
      return (
        <main id="main" className="mx-auto grid min-h-dvh w-full max-w-md grid-cols-1 content-center px-4 py-12">
          <ErrorState error={session.error} onRetry={() => session.refetch()} />
        </main>
      )
    }
    return <LoadingState variant="page" label="Checking your session" />
  }

  if (session.data !== null) {
    const from = (location.state as { from?: Location } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  return <Outlet />
}