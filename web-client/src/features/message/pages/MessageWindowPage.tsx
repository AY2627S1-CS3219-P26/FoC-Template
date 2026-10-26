import { useMessage } from "@/context/MessageContext";
import { useState } from "react";

export function MessageWindowPage({ user, selectedContact }: any) {
    const [newMessage, setNewMessage] = useState('');

    const { socket } = useMessage();

    const handleSendMessage = async (content: String = newMessage, type = 'text') => {

        if (!content.trim() || !socket) return;

        // Word limit check
        if (type === 'text' && content.trim().split(/\s+/).filter(Boolean).length > 12000) {
            alert('Message limit exceeded! Maximum allowed is 12,000 words.');
            return;
        }

        const tempId = Date.now().toString() + Math.random().toString();
        const messageData = {
            _tempId: tempId,
            senderId: user.id,
            receiverId: selectedContact._id,
            content: content,
            type,
            createdAt: new Date()
        };
        socket.emit('sendMessage', messageData);
        setNewMessage('');
    };

    return <div className="grid 4-gap">

        <p>
            {newMessage}
        </p>
        <button onClick={() => handleSendMessage()}>
            Send message
        </button>
    </div>
}
