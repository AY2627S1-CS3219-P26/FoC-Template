
//import { useCurrentUser } from '@/api/user/session'
import { Page } from '@/components/Page'
import { MessageCard } from '../components/MessageCard';
import { useCurrentUser } from '@/api/user/session';
import { useOrderByCourierId } from '@/api/order/order';
import type { Order } from '@/types/order';
import { useUsers } from '@/api/user/admin';




export function MessagePage() {

    const user = useCurrentUser();
    const courierOrders = useOrderByCourierId(user.id).data || [];
    const requesterOrders = useOrderByCourierId(user.id).data || [];
    const users = useUsers({ 0, - 1 });


const uniqueConversationIds: string[] = [...new Set(...courierOrders.map(order => order.requester_id), ...requesterOrders.map(order => order.courier_id),)]
const uniqueConversationInfo = uniqueConversationIds.map(id => users.filter(user => user.id == uniqueConversationIds).map(user => { id: user.id, name: user.name, message: user.name }));



//const transactions = useTransactions(user.id)

return (

    <Page title="Messages" subtitle="Your active messages">
        <div className="grid grid-cols-1 gap-6">


            {/* <h2 className="ds-label">AI messages</h2>
            <MessageCard
                //key={c.id}
                name="RelayAI"
                message={"Ask what you want"}
            /> */}



            <h2 className="ds-label">Messages</h2>

            <MessageCard conversationId="217fbdf5-a630-4093-bfc4-4e2c5fa210ad" name="User" message='This is a test' />

            {uniqueConversationInfo.map((c) => (
                <MessageCard
                    conversationId={c.id}
                    name={c.name}
                    message={c.message}
                />
            ))}


        </div>
    </Page>


)
}
