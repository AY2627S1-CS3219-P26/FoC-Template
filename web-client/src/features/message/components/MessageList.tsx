import { useEffect, useRef } from 'react'
import type { Message } from '@/api/message/types'
import { MessageField } from './MessageField'

type MessageListProps = {
  messages: Message[]
  ownId: string
  hasEarlier: boolean
  loadingEarlier: boolean
  onLoadEarlier: () => void
  // Keeps room at the bottom, so the last message is never hidden behind the composer.
  reserveComposerSpace: boolean
}

export function MessageList({
  messages,
  ownId,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  reserveComposerSpace,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)
  const lastMessageId = messages.at(-1)?._id

  // Only a new last message scrolls down, so loading earlier messages keeps the reader's place.
  // Opening the chat jumps straight to the newest message; later messages glide in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: hasScrolled.current ? 'smooth' : 'instant' })
    hasScrolled.current = true
  }, [lastMessageId])

  return (
    <div className={reserveComposerSpace ? 'grid grid-cols-1 gap-3 pb-40' : 'grid grid-cols-1 gap-3'}>
      {hasEarlier && (
        <button
          type="button"
          className="ds-btn ds-btn--glass"
          aria-disabled={loadingEarlier}
          onClick={() => !loadingEarlier && onLoadEarlier()}
        >
          Load earlier messages
        </button>
      )}
      {messages.length === 0 && <p className="text-muted">No messages yet. Say hello.</p>}
      {messages.map((m) => (
        <MessageField
          key={m._id}
          position={m.senderId === ownId ? 'right' : 'left'}
          content={m.content}
          timestamp={m.createdAt}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
