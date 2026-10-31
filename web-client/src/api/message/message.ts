
//import { request } from '@/lib/http'

import { useQuery } from "@tanstack/react-query";
import { request } from '@/lib/http'
import type { Message } from '@/types/message'


export function useLastMessage(userId: string) {
    return useQuery({
        queryKey: ['message', 'lastMessage', userId],
        queryFn: ({ signal }) => request<any>('message', `/messages/last-message/${userId}`, { signal }),
    })
}

export function useConversation(senderId: string, receiverID: string) {
    return useQuery({
        queryKey: ['message', 'conversation', senderId, receiverID],
        queryFn: ({ signal }) => request<Message[]>('message', `/messages/${senderId}/${receiverID}`, { signal }),
    })
}
