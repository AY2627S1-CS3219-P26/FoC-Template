
import { useCurrentUser } from '@/api/user/session'
import { Page } from '@/components/Page'
import { BalanceCard } from '@/features/credit/components/BalanceCard'
import { useEffect, useState } from 'react'
import { io } from "socket.io-client";
import { MessageCard } from '../components/MessageCard';



export function MessagePage() {

    const user = useCurrentUser()
    const [socket, setSocket] = useState(null);

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

    useEffect(() => {



        const socket = io('http://localhost:3008'); //TODO: move to env
        //setSocket(socket);

        socket.on('connect', () => {
            console.log(socket.connected);
            socket.emit('join', String(user.id));
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected, clearing states');
        });

        // socket.on('onlineUsers', (users) => {
        //     setOnlineUsers(users.map(id => String(id)));
        // });




        socket.on('receiveMessage', (msg) => {
            // Only increase unread if NOT current chat
            if (msg.senderId !== user.id) {

            }
        });
        socket.on('messagesRead', ({ readerId }) => {

        });

        return () => {
            socket.close();
        };
    }, [user]);


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
