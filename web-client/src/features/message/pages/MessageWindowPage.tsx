import { useMessage } from "@/context/MessageContext";
import type { Message } from "@/types/message";
import { useEffect, useRef, useState } from "react";
import { MessageField } from "../components/MessageField";
import { useParams } from "react-router";
import { useCurrentUser } from "@/api/user/session";
import { SYSTEM_SENDER_ID, useConversation } from "@/api/message/message";

export function MessageWindowPage() {
    const { id = "" } = useParams();
    const user = useCurrentUser();
    const isSystem = id === SYSTEM_SENDER_ID;


    const [newMessage, setNewMessage] = useState('');
    const [sent, setSent] = useState<Message[]>([]);
    const { messages: received, socket, isConnected } = useMessage();
    const history = useConversation(user.id, id);

    const past = history.data?.pages.flatMap((page) => page.items) ?? [];
    // A message can arrive both live and in a page of history, so _id decides what is one message.
    const byId = new Map(
        [...past, ...received, ...sent]
            .filter(
                (m) =>
                    (m.senderId === user.id && m.receiverId === id) ||
                    (m.senderId === id && m.receiverId === user.id),
            )
            .map((m) => [m._id, m]),
    );
    const messages = [...byId.values()].sort(
        (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );
    const lastMessageId = messages.at(-1)?._id;

    const handleSendMessage = (content: string = newMessage, type = 'text') => {
        if (!content.trim() || !socket) return;

        if (type === 'text' && content.trim().split(/\s+/).filter(Boolean).length > 12000) {
            alert('Message limit exceeded! Maximum allowed is 12,000 words.');
            return;
        }

        // The server only emits to the receiver, so our own copy comes back through the ack.
        // On a refusal the text goes back into the field, so nothing typed is lost.
        socket.emit('sendMessage', { receiverId: id, content }, (saved: Message | { error: { message: string } }) => {
            if ('error' in saved) {
                setNewMessage(content);
                return;
            }
            setSent((prev) => [...prev, saved]);
        });
        setNewMessage('');
    };


    // inside the component, next to your other hooks:
    const bottomRef = useRef<HTMLDivElement>(null);

    // Only a new last message scrolls down, so loading earlier messages keeps the reader's place.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lastMessageId]);

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-2 p-4 pb-24">
            <div className="sticky top-2 z-10 mb-2 rounded-2xl bg-[var(--ds-coral-300)] px-5 py-3 shadow-md">
                <p className="ds-title font-bold">{isSystem ? "Relay" : id}</p>
            </div>


            {history.hasNextPage && (
                <button
                    className="ds-btn ds-btn--glass"
                    disabled={history.isFetchingNextPage}
                    onClick={() => history.fetchNextPage()}
                >
                    Load earlier messages
                </button>
            )}

            {messages.map((m) => (
                <MessageField
                    key={m._id}
                    position={m.senderId === user.id ? "right" : "left"}
                    content={m.content}
                    timestamp={m.timestamp ?? m.createdAt ?? ""}
                />
            ))}
            <div ref={bottomRef} />

            {!isSystem && (
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
            )}
        </div>
    );
}
