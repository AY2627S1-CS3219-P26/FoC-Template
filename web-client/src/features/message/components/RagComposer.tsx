
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Message } from '@/api/message/types'
import { postPrompt } from '@/api/rag/prompt'


const RAG_ID = "1";

type MessageComposerProps = {
    messages: Message[]
    senderId: string
    addMessage: (message: Message) => void
}

function generateUniqueId(): string {
    // Format: YYYYMMDDHHMMSS
    const dateStr = new Date().toISOString()
        .replace(/[-T:.Z]/g, '')
        .slice(0, 14);

    // Generate a random 4-digit number (1000 to 9999)
    const randomNum = Math.floor(1000 + Math.random() * 9000).toString();

    return `${dateStr}-${randomNum}`;
}



export function RagComposer({ messages, senderId, addMessage }: MessageComposerProps) {

    const [text, setText] = useState('')


    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        const userMessage: Message = {
            _id: generateUniqueId(),
            senderId: senderId,
            receiverId: RAG_ID,
            content: text,
            status: "read",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }


        if (!text.trim()) return



        addMessage(userMessage)
        const data = await postPrompt(text, messages.map((m) => m.content))

        const ragMessage: Message = {
            _id: generateUniqueId(),
            senderId: RAG_ID,
            receiverId: senderId,
            content: data?.response || "Unable to get a answer",
            status: "read",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        addMessage(ragMessage)

        setText('')

    }

    return (

        <div className="fixed inset-x-0 bottom-24 z-10 lg:bottom-0 lg:left-64">

            <form
                noValidate
                onSubmit={handleSubmit}
                className="mx-auto grid w-full max-w-layout grid-cols-1 gap-2 px-4 pb-4 md:px-8 lg:pb-6"
            >

                <div className="ds-surface ds-surface--chrome flex gap-2 p-2">
                    <input
                        className="ds-field min-w-0 flex-1"
                        aria-label="Prompt"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a prompt"
                    />
                    <button type="submit" className="ds-btn ds-btn--primary">
                        Send
                    </button>
                </div>
            </form>
        </div>
    )
}
