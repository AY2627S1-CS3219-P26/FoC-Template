
//import { useCurrentUser } from '@/api/user/session'
import { Page } from '@/components/Page'
import { MessageCard } from '../components/MessageCard';




export function MessagePage() {

    //const user = useCurrentUser()

    const conversations = [{
        name: "William",
        message: "hallo"
    },
    {
        name: "frank",
        message: "sfhalsdkhf"
    },
    {
        name: "adam",
        message: "hej med dig"
    }]



    //const transactions = useTransactions(user.id)

    return (

        <Page title="Messages" subtitle="Your active messages">
            <div className="grid grid-cols-1 gap-6">


                <h2 className="ds-label">AI messages</h2>
                <MessageCard
                    //key={c.id}
                    name="RelayAI"
                    message={"Ask what you want"}
                />



                <h2 className="ds-label">Messages</h2>

                {conversations.map((c) => (
                    <MessageCard
                        //key={c.id}
                        name={c.name}
                        message={c.message}
                    />
                ))}
                <MessageCard name="William" message='Hej min gode ven william kento rasmussen' />

            </div>
        </Page>


    )
}
