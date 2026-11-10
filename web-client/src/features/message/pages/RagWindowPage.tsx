import { useCurrentUser } from '@/api/user/session'
import type { Message } from '@/api/message/types'

import { MessageList } from '../components/MessageList'
import { useState } from 'react'
import { RagComposer } from '../components/RagComposer'

// The content of the assistant overlay: the conversation scrolls, the composer stays at the bottom.
export function RagWindowPage() {
  const user = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([])

  function addMessage(message: Message) {
    setMessages((prev) => [...prev, message])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <MessageList
          messages={messages}
          ownId={user.id}
          hasEarlier={false}
          loadingEarlier={false}
          onLoadEarlier={() => { }}
          reserveComposerSpace={false}
        />
      </div>

      <RagComposer messages={messages} senderId={user.id} addMessage={addMessage} />
    </div>
  )
}
