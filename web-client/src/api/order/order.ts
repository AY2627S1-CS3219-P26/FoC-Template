import { useQuery } from '@tanstack/react-query'
import { request } from '@/lib/http'
import type { Order } from '@/types/order'




export function useOrderByCourierId(courierId: string) {
    return useQuery({
        queryKey: ['credit', 'balance', courierId],
        queryFn: ({ signal }) => request<Order[]>('order', `/order/courier/${courierId}`, { signal }),
    })
}

export function useOrderByRequesterId(requesterId: string) {
    return useQuery({
        queryKey: ['credit', 'balance', requesterId],
        queryFn: ({ signal }) => request<Order[]>('order', `/order/requester/${requesterId}`, { signal }),
    })
}
