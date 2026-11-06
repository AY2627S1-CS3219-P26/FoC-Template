import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { messageKeys, SYSTEM_SENDER_ID, useConversation } from '@/api/message/message'
import type { Message, SocketError } from '@/api/message/types'
import { useName } from '@/api/user/member'
import { useCurrentUser } from '@/api/user/session'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Notice } from '@/components/Notice'
import { Page } from '@/components/Page'
import { MessageField } from '../components/MessageField'
import { useMessage } from '../messageContext'

const SEND_TIMEOUT_MS = 5000

export function MessageWindowPage() {
  const { id = '' } = useParams()
  const user = useCurrentUser()
  const isSystem = id === SYSTEM_SENDER_ID
  const name = useName(id, !isSystem)
  const title = isSystem ? 'Relay' : (name.data ?? 'Conversation')

  const queryClient = useQueryClient()
  const { received, socket } = useMessage()
  const history = useConversation(user.id, id)
  const [newMessage, setNewMessage] = useState('')
  const [sent, setSent] = useState<Message[]>([])
  const [sendError, setSendError] = useState<string | null>(null)

  const past = history.data?.pages.flatMap((page) => page.items) ?? []
  // A message can arrive both live and in a page of history, so _id decides what is one message.
  const byId = new Map(
    [...past, ...received, ...sent]
      .filter(
        (m) => (m.senderId === user.id && m.receiverId === id) || (m.senderId === id && m.receiverId === user.id),
      )
      .map((m) => [m._id, m]),
  )
  const messages = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const lastMessageId = messages.at(-1)?._id
  const lastIncomingId = messages.findLast((m) => m.senderId === id)?._id

  // Runs when the page opens and whenever a new message from the other person arrives while it is open.
  useEffect(() => {
    if (!socket || !lastIncomingId) return
    socket.emit('markAsRead', { senderId: id }, () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
    })
  }, [socket, id, lastIncomingId, queryClient])

  const bottomRef = useRef<HTMLDivElement>(null)
  // Only a new last message scrolls down, so loading earlier messages keeps the reader's place.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lastMessageId])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = newMessage
    if (!socket || !content.trim()) return

    setSendError(null)
    setNewMessage('')
    // The server only emits to the receiver, so our own copy comes back through the ack.
    // On a refusal or no answer the text goes back into the field, so nothing typed is lost.
    socket
      .timeout(SEND_TIMEOUT_MS)
      .emit('sendMessage', { receiverId: id, content }, (err: Error | null, saved: Message | SocketError) => {
        if (err) {
          setNewMessage(content)
          setSendError('The message service did not answer. Try again.')
          return
        }
        if ('error' in saved) {
          setNewMessage(content)
          setSendError(saved.error.message)
          return
        }
        setSent((prev) => [...prev, saved])
        void queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
      })
  }

  return (
    <Page
      title={title}
      actions={
        <Link to="/message" className="ds-btn ds-btn--glass">
          <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
          Messages
        </Link>
      }
    >
      {history.data === undefined ? (
        history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : (
          <LoadingState label="Loading messages" />
        )
      ) : (
        // Room at the bottom so the last message is never hidden behind the composer.
        <div className={isSystem ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-3 pb-40'}>
          {history.hasNextPage && (
            <button
              type="button"
              className="ds-btn ds-btn--glass"
              aria-disabled={history.isFetchingNextPage}
              onClick={() => !history.isFetchingNextPage && history.fetchNextPage()}
            >
              Load earlier messages
            </button>
          )}
          {messages.length === 0 && <p className="text-muted">No messages yet. Say hello.</p>}
          {messages.map((m) => (
            <MessageField
              key={m._id}
              position={m.senderId === user.id ? 'right' : 'left'}
              content={m.content}
              timestamp={m.createdAt}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {!isSystem && (
        // Pinned to the bottom of the screen: above the floating tab bar on phones, and next to
        // the sidebar from lg, where the tab bar is gone. Same width and gutters as Page.
        <div className="fixed inset-x-0 bottom-24 z-10 lg:bottom-0 lg:left-64">
          <form
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto grid w-full max-w-layout grid-cols-1 gap-2 px-4 pb-4 md:px-8 lg:pb-6"
          >
            {!socket && (
              <Notice tone="info" role="status" title="Connecting">
                Messages can be sent as soon as the connection is back.
              </Notice>
            )}
            {sendError && <Notice tone="danger" role="alert" title={sendError} />}
            <div className="ds-surface ds-surface--chrome flex gap-2 p-2">
              <input
                className="ds-field min-w-0 flex-1"
                aria-label="Message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
              />
              <button type="submit" className="ds-btn ds-btn--primary" aria-disabled={!socket}>
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  )
}
