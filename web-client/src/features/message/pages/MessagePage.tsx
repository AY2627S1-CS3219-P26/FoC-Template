
import { Page } from '@/components/Page'
import { MessageCard } from '../components/MessageCard';
import { useCurrentUser } from '@/api/user/session';
//import { useOrderByCourierId, useOrderByRequesterId } from '@/api/order/order';
import { SYSTEM_SENDER_ID, useLastMessage } from '@/api/message/message';




export function MessagePage() {

    const user = useCurrentUser();
    //const courierOrders = useOrderByCourierId(user.id).data ?? [];
    //const requesterOrders = useOrderByRequesterId(user.id).data ?? [];
    const systemMessage = useLastMessage(SYSTEM_SENDER_ID).data;

    // One conversation per other person, shown by id until the user-service offer members a way to look up names.
    const conversations = new Map<string, number>();
    // for (const order of courierOrders) conversations.set(order.requester_id, order.id);
    // for (const order of requesterOrders) {
    //     if (order.courier_id) conversations.set(order.courier_id, order.id);
    // }




    return (

        <Page title="Messages" subtitle="Your active messages">
            <div className="grid grid-cols-1 gap-6">


                {/* <h2 className="ds-label">AI messages</h2>
            <MessageCard
                //key={c.id}
                name="RelayAI" #1268c530-68bf-4a64-ae18-6884f0931741
                message={"Ask what you want"} # eeb4e173-feec-4d64-bed0-b6b42e7eaf4f
            /> */}



                <h2 className="ds-label">Messages</h2>

                {systemMessage && (
                    <MessageCard conversationId={SYSTEM_SENDER_ID} name="Relay" message={systemMessage.content} />
                )}

                <MessageCard conversationId="217fbdf5-a630-4093-bfc4-4e2c5fa210ad" name="old" message='This is a test' />
                <MessageCard conversationId="eeb4e173-feec-4d64-bed0-b6b42e7eaf4f" name="10" message='This is a test' />
                <MessageCard conversationId="1268c530-68bf-4a64-ae18-6884f0931741" name="11" message='This is a test' />

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
