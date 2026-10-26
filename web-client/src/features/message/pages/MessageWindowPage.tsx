import { useMessage } from "@/context/MessageContext";
import { useState } from "react";

export function MessageWindowPage() {
    const user = { id: 321 }
    const selectedContact = { _id: 123 }

    const [newMessage, setNewMessage] = useState('');
    const { messages, socket, isConnected } = useMessage();

    const handleSendMessage = (content: string = newMessage, type = 'text') => {
        if (!content.trim() || !socket) return;

        if (type === 'text' && content.trim().split(/\s+/).filter(Boolean).length > 12000) {
            alert('Message limit exceeded! Maximum allowed is 12,000 words.');
            return;
        }

        socket.emit('sendMessage', {
            _tempId: Date.now().toString() + Math.random().toString(),
            senderId: user.id,
            receiverId: selectedContact._id,
            content,
            type,
            createdAt: new Date(),
        });
        console.log("New message:", newMessage);
        setNewMessage('');
    };

    console.log("Message window:",);
    return (
        <div className="grid gap-4">
            <pre>{JSON.stringify(messages, null, 2)}</pre>

            <input
                className="ds-field"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
            />

            <button className="ds-btn ds-btn--primary" disabled={!isConnected} onClick={() => handleSendMessage()}>
                Send message
            </button>
        </div>
    );
}
