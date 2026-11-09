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
  const details = rec.details ?? (isRecord(rec.body) ? rec.body.details : undefined)
  return { status, code, message, details }
}
 
/** The service's error code, e.g. NEEDED_BY_TIME_IN_PAST ('' when there is none). */
export function orderErrorCode(err: unknown): string {
  return errorParts(err).code
}
 
/** Turn an ApiError from the order-service into something a student can act on. */
export function describeOrderError(err: unknown, fallback: string): string {
  const { status, code, message } = errorParts(err)
  if (code === 'NETWORK_ERROR') return message
  if (status === 401) return 'Your session has expired. Please sign in again.'
  switch (code) {
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
    default:
      // The services send a readable message with every error.
      return message || fallback
  }
}
 
/** Zod `format()` output from the service (400 `details`) -> first message per field. */
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
