
//import { request } from '@/lib/http'

import { useQuery } from "@tanstack/react-query";
import { request } from '@/lib/http'


export function useLastMessage(userId: string) {
    return useQuery({
        queryKey: ['message', 'lastMessage', userId],
        queryFn: ({ signal }) => request<any>('message', `/message/last-message/${userId}`, { signal }),
    })
}

export function useConversation(senderId: string, receiverID: string) {
    return useQuery({
        queryKey: ['message', 'lastMessage', senderId, receiverID],
        queryFn: ({ signal }) => request<any>('message', `/message/${senderId}/${receiverID}`, { signal }),
    })
}
