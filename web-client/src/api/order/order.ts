import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/http'
import type { Supplier } from '@/api/supplier/types'

export type OrderStatus =
  | 'Pending'
  | 'Open'
  | 'Accepted'
  | 'PickedUp'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'

export type Order = {
  id: number
  requester_id: string
  courier_id: string | null
  supplier_id: string
  delivery_location: string
  // ISO date strings
  needed_by_time: string
  item_lines: string[]
  credit_reward: number
  status: OrderStatus
  created_at: string
  updated_at: string
}

// Mirrors CreateOrderSchema in order-service.
export type CreateOrderInput = {
  supplierId: string
  deliveryLocation: string
  neededByTime: string // ISO timestamp
  itemLines: string[]
  creditReward: number
}

export type MyOrders = { orders: Order[]; accountId: string }

// Refetch while the page is visible so couriers see new errands and requesters see progress.
const POLL_MS = 15_000

export function useOpenOrders() {
  return useQuery({
    queryKey: ['order', 'open'],
    queryFn: async ({ signal }) => (await request<{ data: Order[] }>('order', '/orders/open', { signal })).data,
    refetchInterval: POLL_MS,
  })
}

// Orders I requested or am delivering, plus account id (GET /orders/mine).
export function useMyOrders() {
  return useQuery({
    queryKey: ['order', 'mine'],
    queryFn: async ({ signal }): Promise<MyOrders> => {
      const body = await request<{ data: Order[]; accountId: string }>('order', '/orders/mine', { signal })
      return { orders: body.data, accountId: body.accountId }
    },
    refetchInterval: POLL_MS,
  })
}

// Pulls the suppliers out of the page that useSuppliers returns
export function suppliersOf(page: unknown): Supplier[] {
  const list = Array.isArray(page)
    ? page
    : isRecord(page)
      ? [page.items, page.data, page.results].find(Array.isArray) ?? []
      : []
  return (list as unknown[]).filter(
    (item): item is Supplier => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string',
  )
}

function useInvalidateOrders() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['order'] })
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      request<{ data: Order }>('order', '/orders', { method: 'POST', body: input }),
    onSettled: invalidate,
  })
}

export function useAcceptOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (id: number) => request<{ data: Order }>('order', `/orders/${id}/accept`, { method: 'POST' }),
    onSettled: invalidate,
  })
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      request<{ data: Order }>('order', `/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSettled: invalidate,
  })
}

// ---- Error helpers ----------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function errorParts(err: unknown) {
  const rec = isRecord(err) ? err : {}
  const status = typeof rec.status === 'number' ? rec.status : 0
  const code = typeof rec.code === 'string' ? rec.code : ''
  const message = err instanceof Error ? err.message : ''
  const details = rec.details
  return {
    status,
    code,
    message,
    details,
    network: code === 'NETWORK_ERROR' || err instanceof TypeError,
  }
}
export function describeOrderError(err: unknown, fallback: string): string {
  const { status, code, message, network } = errorParts(err)

  if (network) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  if (status === 401 || status === 403) {
    if (message.includes(' ') && !message.startsWith('Access denied')) return message
    return 'Your session has expired. Please sign in again.'
  }

  console.log(code)

  switch (code || message) {
    case 'NEEDED_BY_TIME_IN_PAST':
      return 'The needed-by time must be in the future.'

    case 'SUPPLIER_NOT_FOUND':
      return 'That pickup location no longer exists.'

    case 'SUPPLIER_NOT_ORDERABLE':
      return 'That pickup location is closed or inactive at your needed-by time.'

    case 'SUPPLIER_UNAVAILABLE':
    case 'DEPENDENCY_UNAVAILABLE':
      return 'A required service is unavailable right now. Check “My requests” before trying again so you do not create a duplicate.'

    case 'CREDIT_RESERVATION_FAILED':
      return 'Could not reserve the reward. You may not have enough available credits.'

    case 'INVALID_STATE_TRANSITION':
    case 'STATUS_UPDATE_FAILED':
      return 'This errand changed in the meantime. The list has been refreshed.'

    case 'ORDER_NOT_FOUND':
      return 'This errand could not be found. It may have been removed.'

    case 'REQUESTER_CANNOT_ACCEPT_OWN_ORDER':
      return 'You cannot accept your own errand.'

    case 'ORDER_NOT_AVAILABLE':
      return 'This errand is no longer available.'

    case 'ORDER_ACCEPTANCE_FAILED':
      return 'Could not accept this errand. Please refresh and try again.'

    case 'UNAUTHORIZED_COURIER_ACTION':
      return 'Only the assigned courier can update this errand status.'

    case 'UNAUTHORIZED_REQUESTER_ACTION':
      return 'Only the requester can perform this action.'

    case 'ORDER_CREATION_FAILED':
      return 'Could not create your errand. Please try again.'

    default:
      return message.includes(' ') ? message : fallback
  }
}

export function orderFieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  const { details } = errorParts(err)
  if (!isRecord(details)) return out
  const first = (value: unknown) =>
    isRecord(value) && Array.isArray(value._errors) && typeof value._errors[0] === 'string'
      ? (value._errors[0] as string)
      : undefined
  for (const [field, value] of Object.entries(details)) {
    const direct = first(value)
    if (direct) out[field] = direct
    else if (isRecord(value)) {
      // itemLines errors are nested per index
      const nested = Object.values(value).map(first).find(Boolean)
      if (nested) out[field] = nested
    }
  }
  return out
}
