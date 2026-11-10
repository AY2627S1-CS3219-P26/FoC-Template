import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, request } from '@/lib/http'

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

export type OrderTransition = {
  from_status: OrderStatus
  to_status: OrderStatus
  actor: string
  occurred_at: string
}

// GET /orders/mine adds what the account may do next, so the client never works out the rules itself.
export type MyOrder = Order & {
  role: 'requester' | 'courier'
  allowed_transitions: OrderStatus[]
  transitions: OrderTransition[]
}

export type MyOrders = { orders: MyOrder[]; accountId: string }

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
      const body = await request<{ data: MyOrder[]; accountId: string }>('order', '/orders/mine', { signal })
      return { orders: body.data, accountId: body.accountId }
    },
    refetchInterval: POLL_MS,
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

export function useOrder(id: number) {
  return useQuery({
    queryKey: ['order', 'detail', id],
    queryFn: async ({ signal }) => (await request<{ data: Order }>('order', `/orders/${id}`, { signal })).data,
    enabled: id > 0,
    refetchInterval: POLL_MS,
  })
}

// ---- Error helpers ----------------------------------------------------------

/** The order-service sends a readable reason with every error, so that is what the student sees. */
export function describeOrderError(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback
}
