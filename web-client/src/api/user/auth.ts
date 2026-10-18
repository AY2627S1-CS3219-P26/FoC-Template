import { hashKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/http'
import { sessionKey } from './session'
import type { PublicUser } from './types'

export type LoginInput = {
  // Username or NUS email; the user-service decides which one it is.
  identifier: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => request<PublicUser>('user', '/auth/login', { method: 'POST', body: input }),
    onSuccess: (user) => {
      // The session entry is updated, not removed, because the guards are subscribed to it:
      // RequireGuest then sends the user on to where they came from. Everything else goes, so
      // nothing cached for an account whose session ended in this tab shows for this one.
      queryClient.setQueryData(sessionKey, user)
      queryClient.removeQueries({ predicate: (query) => query.queryHash !== hashKey(sessionKey) })
    },
  })
}
