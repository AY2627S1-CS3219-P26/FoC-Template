import { Link } from 'react-router'
import { useConversations } from '@/api/message/message'
import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { QueryView } from '@/components/QueryView'
import { MessageCard } from '../components/MessageCard'
import { RagCard } from '../components/RagCard'

export function MessagePage() {
  const conversations = useConversations()

  return (
    <Page title="Messages" subtitle="Your conversations with people and AI">

      <h2>AI</h2>
      <ul className="ds-surface ds-rows"><RagCard /></ul>

      <h2>People</h2>
      <QueryView
        query={conversations}
        loadingLabel="Loading conversations"
        isEmpty={(items) => items.length === 0}
        empty={
          <EmptyState
            title="No conversations yet"
            action={
              <Link to="/errands" className="ds-btn ds-btn--glass">
                Browse errands
              </Link>
            }
          />
        }
      >
        {(items) => (
          <ul className="ds-surface ds-rows">
            {items.map((conversation) => (
              <MessageCard key={conversation.otherId} conversation={conversation} />
            ))}
          </ul>
        )}
      </QueryView>
    </Page>
  )
}
