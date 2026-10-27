import { useMessage } from "@/context/MessageContext";
import type { Message } from "@/types/message";
import { useEffect, useRef, useState } from "react";
import { MessageField } from "../components/MessageField";

export function MessageWindowPage() {
    const user = { id: "217fbdf5-a630-4093-bfc4-4e2c5fa210ad" }
    const selectedContact = {
        _id: "217fbdf5-a630-4093-bfc4-4e2c5fa210ad",
        name: "William"
    }

    const [newMessage, setNewMessage] = useState('');
    const { messages, socket, isConnected } = useMessage();

    const handleSendMessage = (content: string = newMessage, type = 'text') => {
        if (!content.trim() || !socket) return;

        if (type === 'text' && content.trim().split(/\s+/).filter(Boolean).length > 12000) {
            alert('Message limit exceeded! Maximum allowed is 12,000 words.');
            return;
        }

        const message: Message = {
            //_tempId: Date.now().toString() + Math.random().toString(),
            senderId: user.id,
            receiverId: selectedContact._id,
            content,
            status: "unread",
            timestamp: new Date(),
        }

        socket.emit('sendMessage', message);
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
                <p className="ds-title font-bold">{selectedContact.name}</p>
            </div>


            {messages.map((m, i) => (
                <MessageField
                    key={i}
                    position={m.senderId === user.id ? "right" : "left"}
                    content={m.content}
                    timestamp={m.timestamp}
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
