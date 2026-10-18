import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { request } from '@/lib/http'
import type { Paginated } from '@/lib/http'
import type { PublicUser } from './types'

export type UserListFilters = {
  page: number
  pageSize: number
}

// Administrators only; the user-service refuses everyone else with 403 (F1.4.1).
export function useUsers(filters: UserListFilters) {
  return useQuery({
    queryKey: ['user', 'list', filters],
    queryFn: ({ signal }) => request<Paginated<PublicUser>>('user', '/users', { query: filters, signal }),
    // Keeps the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
