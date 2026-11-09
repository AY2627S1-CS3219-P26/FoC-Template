

import { useCurrentUser } from '@/api/user/session'

import { Page } from '@/components/Page'
import { BackToMessages } from '@/features/message/components/BackToMessages'
import type { Message } from '@/api/message/types'

import { MessageList } from '@/features/message/components/MessageList'
import { useState } from 'react'
import { RagComposer } from '../components/RagComposer'

export function RagWindowPage() {

  const user = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([])


  function addMessage(message: Message) {
    setMessages((prev) => [...prev, message])
  }

  return (
    <Page title="Rag Model" >
      <BackToMessages />


      <MessageList
        messages={messages}
        ownId={user.id}
        hasEarlier={false}
        loadingEarlier={false}
        onLoadEarlier={() => { }}
        reserveComposerSpace={true}
      />



      <RagComposer messages={messages} senderId={user.id} addMessage={addMessage} />
    </Page>
  )
}
