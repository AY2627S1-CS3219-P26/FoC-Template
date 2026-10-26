import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/api/user/session'
import { SessionPending } from './SessionPending'
import { MessageProvider } from '@/context/MessageContext'

// Pages for logged-in accounts only. A guest is sent to the login, and the page they wanted
// goes along as state.from, so RequireGuest can send them back after logging in.
export function RequireSession() {
  const session = useSession()
  const location = useLocation()

  if (session.data === undefined) return <SessionPending session={session} />

  if (session.data === null) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <MessageProvider>
      <Outlet />
    </MessageProvider>
  )
}
