import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { request } from '@/lib/http'
import type { Paginated } from '@/lib/http'
import type { Conversation, Message } from './types'

// The id the message-service uses as the sender of messages from Relay itself.
export const SYSTEM_SENDER_ID = '0'

export const messageKeys = {
  all: ['message'] as const,
  conversations: ['message', 'conversations'] as const,
  conversation: (accountId: string, otherId: string) => ['message', 'conversation', accountId, otherId] as const,
}

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations,
    queryFn: ({ signal }) => request<Conversation[]>('message', '/messages/conversations', { signal }),
  })
}

export function useConversation(accountId: string, otherId: string) {
  return useInfiniteQuery({
    queryKey: messageKeys.conversation(accountId, otherId),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Paginated<Message>>('message', `/messages/${accountId}/${otherId}`, { query: { page: pageParam }, signal }),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })
}

export function postMessage(content: string, receiverId: string, orderId: string) {
  return request<Message>('message', '/messages/send', { method: 'POST', body: { orderId, receiverId, content } })
}
