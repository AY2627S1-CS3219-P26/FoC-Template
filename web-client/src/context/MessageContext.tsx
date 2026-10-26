import { useCurrentUser } from '@/api/user/session';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

interface Message {
    senderId: string | number;
    // add your other fields (id, text, createdAt, ...)
}

interface MessageContextValue {
    messages: Message[];
    isConnected: boolean;
    socket: Socket | null;
}

const MessageContext = createContext<MessageContextValue | null>(null);

const SOCKET_URL = 'http://localhost:3008';

export function MessageProvider({ children }: { children: ReactNode }) {
    const user = useCurrentUser();
    const userId = user?.id;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (userId == null) return;

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        const onConnect = () => {
            setIsConnected(true);
            newSocket.emit('join', String(userId));
        };

        const onDisconnect = () => {
            setIsConnected(false);
        };

        const onReceiveMessage = (msg: Message) => {
            setMessages((prev) => [...prev, msg]);

            // if (String(msg.senderId) !== String(userId)) {
            //     // increase unread count for msg.senderId here
            // }
        };

        //const onMessagesRead = ({ readerId }: { readerId: string | number }) => {
        //    // reset unread count for readerId here
        //};

        newSocket.on('connect', onConnect);
        newSocket.on('disconnect', onDisconnect);
        newSocket.on('receiveMessage', onReceiveMessage);
        //newSocket.on('messagesRead', onMessagesRead);

        return () => {
            newSocket.off('connect', onConnect);
            newSocket.off('disconnect', onDisconnect);
            newSocket.off('receiveMessage', onReceiveMessage);
            //newSocket.off('messagesRead', onMessagesRead);
            newSocket.close();
            setSocket(null);
            setIsConnected(false);
        };
    }, [userId]);



    const value = useMemo(
        () => ({ messages, isConnected, socket }),
        [messages, isConnected, socket] //cached values
    );

    return <MessageContext.Provider value={value}> {children} </MessageContext.Provider>;
}

export function useMessage() {
    const ctx = useContext(MessageContext);
    if (!ctx) throw new Error('useMessage must be used inside <MessageProvider>');
    return ctx;
}
