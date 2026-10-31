import { useMessage } from "@/context/MessageContext";
import type { Message } from "@/types/message";
import { useEffect, useRef, useState } from "react";
import { MessageField } from "../components/MessageField";
import { useParams } from "react-router";
import { useCurrentUser } from "@/api/user/session";
import { useConversation } from "@/api/message/message";

export function MessageWindowPage() {
    const { id = "" } = useParams();
    const user = useCurrentUser();


    const [newMessage, setNewMessage] = useState('');
    const [sent, setSent] = useState<Message[]>([]);
    const { messages: received, socket, isConnected } = useMessage();
    const history = useConversation(user.id, id);

    // The message-service endpoint is still a stub that answers a string, so only an array counts as history.
    const past = Array.isArray(history.data) ? history.data : [];
    const messages = [...past, ...received, ...sent].filter(
        (m) =>
            (m.senderId === user.id && m.receiverId === id) ||
            (m.senderId === id && m.receiverId === user.id),
    );

    const handleSendMessage = (content: string = newMessage, type = 'text') => {
        if (!content.trim() || !socket) return;

        if (type === 'text' && content.trim().split(/\s+/).filter(Boolean).length > 12000) {
            alert('Message limit exceeded! Maximum allowed is 12,000 words.');
            return;
        }

        // The message-service assigns _id when it accepts the message.
        const message: Omit<Message, "_id"> = {
            //_tempId: Date.now().toString() + Math.random().toString(),
            senderId: user.id,
            receiverId: id,
            content,
            status: "unread",
            timestamp: new Date(),
        }

        // The server only emits to the receiver, so our own copy comes back through the ack.
        socket.emit('sendMessage', message, (saved: Message) => setSent((prev) => [...prev, saved]));
        setNewMessage('');
    };


    // inside the component, next to your other hooks:
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-2 p-4 pb-24">
            <div className="sticky top-2 z-10 mb-2 rounded-2xl bg-[var(--ds-coral-300)] px-5 py-3 shadow-md">
                <p className="ds-title font-bold">{id}</p>
            </div>


            {messages.map((m, i) => (
                <MessageField
                    key={i}
                    position={m.senderId === user.id ? "right" : "left"}
                    content={m.content}
                    timestamp={m.timestamp ?? m.createdAt ?? ""}
                />
            ))}
            <div ref={bottomRef} />

            <div className="fixed bottom-6 left-1/2 flex w-full max-w-3xl -translate-x-1/2 gap-2 px-4">
                <input
                    className="ds-field flex-1"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message"
                />
                <button
                    className="ds-btn ds-btn--primary"
                    disabled={!isConnected}
                    onClick={() => handleSendMessage()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
