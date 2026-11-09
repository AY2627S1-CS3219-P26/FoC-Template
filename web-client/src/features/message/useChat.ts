import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { messageKeys, useConversation } from '@/api/message/message'
import type { Message } from '@/api/message/types'
import { useCurrentUser } from '@/api/user/session'
import { useMessage } from './messageContext'

// One conversation as it should be shown: history, live messages and our own sends, oldest first.
export function useChat(otherId: string) {
  const userId = useCurrentUser().id
  const queryClient = useQueryClient()
  const { received, socket } = useMessage()
  const history = useConversation(userId, otherId)
  const [sent, setSent] = useState<Message[]>([])

  const past = history.data?.pages.flatMap((page) => page.items) ?? []
  // A message can arrive both live and in a page of history, so _id decides what is one message.
  const byId = new Map(
    [...past, ...received, ...sent]
      .filter(
        (m) =>
          (m.senderId === userId && m.receiverId === otherId) || (m.senderId === otherId && m.receiverId === userId),
      )
      .map((m) => [m._id, m]),
  )
  const messages = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const lastIncomingId = messages.findLast((m) => m.senderId === otherId)?._id

  // Runs when the page opens and whenever a new message from the other person arrives while it is open.
  useEffect(() => {
    if (!socket || !lastIncomingId) return
    socket.emit('markAsRead', { senderId: otherId }, () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
    })
  }, [socket, otherId, lastIncomingId, queryClient])

  function addSent(message: Message) {
    setSent((prev) => [...prev, message])
  }

  return { history, messages, addSent }
}
