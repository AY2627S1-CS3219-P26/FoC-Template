
import { Page } from '@/components/Page'
import { MessageCard } from '../components/MessageCard';
import { useCurrentUser } from '@/api/user/session';
import { useOrderByCourierId, useOrderByRequesterId } from '@/api/order/order';




export function MessagePage() {

    const user = useCurrentUser();
    const courierOrders = useOrderByCourierId(user.id).data ?? [];
    const requesterOrders = useOrderByRequesterId(user.id).data ?? [];

    // One conversation per other person, shown by id until the user-service offers members a way to look up names.
    const conversations = new Map<string, number>();
    for (const order of courierOrders) conversations.set(order.requester_id, order.id);
    for (const order of requesterOrders) {
        if (order.courier_id) conversations.set(order.courier_id, order.id);
    }



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

            {[...conversations].map(([otherId, orderId]) => (
                <MessageCard
                    key={otherId}
                    conversationId={otherId}
                    name={otherId}
                    message={`Order #${orderId}`}
                />
            ))}


        </div>
    </Page>


)
}
