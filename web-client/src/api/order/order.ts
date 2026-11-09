import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/http'

// Mirrors order-service/src/models/order.model.ts (the service returns snake_case rows).
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

export type Supplier = { id: string; name: string }

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

// Orders I requested or am delivering, plus my account id (GET /orders/mine).
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

// TEMPORARY: replace with your existing supplier api hook (and its Supplier type) if you have one.
export function useSuppliers() {
  return useQuery({
    queryKey: ['supplier', 'list'],
    queryFn: async ({ signal }): Promise<Supplier[]> => {
      const body = await request<unknown>('supplier', '/suppliers', { signal })
      const list = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.data) ? body.data : []
      return list.flatMap((item: unknown): Supplier[] => {
        if (!isRecord(item)) return []
        const id = item.id ?? item._id
        if ((typeof id !== 'string' && typeof id !== 'number') || typeof item.name !== 'string') return []
        return [{ id: String(id), name: item.name }]
      })
    },
    retry: false,
  })
}

function useInvalidateOrders() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['order'] })
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      request<{ data: Order }>('order', '/orders', { method: 'POST', body: JSON.stringify(input) }),
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
      request<{ data: Order }>('order', `/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSettled: invalidate,
  })
}

// ---- Error helpers ----------------------------------------------------------
// Written against the shape the service returns ({ error, details? }) but tolerant of
// however @/lib/http surfaces failures (status / message / details or body.details).

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function errorParts(err: unknown) {
  const rec = isRecord(err) ? err : {}
  const status = typeof rec.status === 'number' ? rec.status : 0
  const message = err instanceof Error ? err.message : typeof rec.error === 'string' ? rec.error : ''
  const details = rec.details ?? (isRecord(rec.body) ? rec.body.details : undefined)
  return { status, message, details, network: err instanceof TypeError }
}

/** Turn a service error into something a student can act on. */
export function describeOrderError(err: unknown, fallback: string): string {
  const { status, message, network } = errorParts(err)
  if (network) return 'Could not reach the server. Check your connection and try again.'
  if (status === 401 || status === 403) {
    // Accept/status endpoints send readable 403 messages; auth failures send codes.
    if (message.includes(' ') && !message.startsWith('Access denied')) return message
    return 'Your session has expired. Please sign in again.'
  }
  switch (message) {
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
    default:
      // Readable messages from the service (they contain spaces) are shown as is.
      return message.includes(' ') ? message : fallback
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
