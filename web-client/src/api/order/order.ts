import { useQuery } from '@tanstack/react-query'
import { request } from '@/lib/http'
import type { Order } from '@/types/order'




export function useOrderByCourierId(courierId: string) {
    return useQuery({
        queryKey: ['order', 'courier', courierId],
        queryFn: async ({ signal }) =>
            (await request<{ data: Order[] }>('order', `/orders/courier/${courierId}`, { signal })).data,
    })
}

export function useOrderByRequesterId(requesterId: string) {
    return useQuery({
        queryKey: ['order', 'requester', requesterId],
        queryFn: async ({ signal }) =>
            (await request<{ data: Order[] }>('order', `/orders/requester/${requesterId}`, { signal })).data,
    })
}
