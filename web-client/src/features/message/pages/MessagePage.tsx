
import { useCurrentUser } from '@/api/user/session'
import { Page } from '@/components/Page'
import { BalanceCard } from '@/features/credit/components/BalanceCard'
import { useEffect, useState } from 'react'
import { io } from "socket.io-client";



export function MessagePage() {

    const user = useCurrentUser()
    const [socket, setSocket] = useState(null);

    useEffect(() => {



        const newSocket = io('http://localhost:3008'); //TODO: move to env
        //setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join', String(user.id));
        });

        // newSocket.on('onlineUsers', (users) => {
        //     setOnlineUsers(users.map(id => String(id)));
        // });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected, clearing states');
        });


        newSocket.on('receiveMessage', (msg) => {
            // Only increase unread if NOT current chat
            if (msg.senderId !== user.id) {

            }
        });
        newSocket.on('messagesRead', ({ readerId }) => {

        });

        return () => {
            newSocket.close();
        };
    }, [user]);


    //const transactions = useTransactions(user.id)

    return (
        <Page title="Messages" subtitle="Your active messages">
            <div className="grid grid-cols-1 gap-6">
                <BalanceCard />

                <section className="grid grid-cols-1 gap-3">
                    <h2 className="ds-label">Messages</h2>

                </section>
            </div>
        </Page>
    )
}
