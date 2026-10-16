import { useQuery } from '@tanstack/react-query'
import { ApiError, request } from '@/lib/http'
import type { PublicUser } from './types'

export const sessionKey = ['user', 'session'] as const

// The session cookie is HttpOnly, so asking the user-service is the only way to know
// who is logged in. A 401 is not an error here: it means "guest" and becomes null.
async function fetchSession(signal: AbortSignal): Promise<PublicUser | null> {
  try {
    return await request<PublicUser>('user', '/users/me', { signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => fetchSession(signal),
    // Only login and logout change the session, and they update this cache entry directly.
    staleTime: Infinity,
  })
}