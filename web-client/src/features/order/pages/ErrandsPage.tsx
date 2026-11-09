import { Page } from '@/components/Page'
import { MessageErrand } from '../components/MessageErrand'

//Insert the id of the errand owner in receiver
export function ErrandsPage() {
  return <Page title="Errands" subtitle="Your current errands">
    <MessageErrand receiverId="receiverId" />
  </Page>
}
