
//import { request } from '@/lib/http'

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { request } from '@/lib/http'
import type { Paginated } from '@/lib/http'
import type { Message } from '@/types/message'


// The id the message-service uses as the sender of messages from Relay itself.
export const SYSTEM_SENDER_ID = '0'

export function useLastMessage(userId: string) {
    return useQuery({
        queryKey: ['message', 'lastMessage', userId],
        queryFn: ({ signal }) => request<Message | null>('message', `/messages/last-message/${userId}`, { signal }),
    })
}

export function useConversation(senderId: string, receiverID: string) {
    return useInfiniteQuery({
        queryKey: ['message', 'conversation', senderId, receiverID],
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            request<Paginated<Message>>('message', `/messages/${senderId}/${receiverID}`, { query: { page: pageParam }, signal }),
        getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    })
}
