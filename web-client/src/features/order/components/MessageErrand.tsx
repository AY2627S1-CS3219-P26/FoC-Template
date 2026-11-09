import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { postMessage } from '@/api/message/message'
import { FormError } from '@/components/FormError'
import { SubmitButton } from '@/components/SubmitButton'
import { TextAreaField } from '@/components/TextAreaField'

type MessageErrandProps = {
    receiverId: string
}

export function MessageErrand({ receiverId }: MessageErrandProps) {
    const [text, setText] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState<unknown>(null)

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!text.trim() || isSending) return

        setIsSending(true)
        setError(null)

        try {
            await postMessage(text.trim(), receiverId)
            setText('')
            setIsOpen(false)
        } catch (err) {
            setError(err)
        } finally {
            setIsSending(false)
        }
    }

    return (

        <div className=" z-30 flex flex-col items-start gap-3 ">
            {isOpen && (
                <div className="ds-surface w-72 md:w-96">
                    <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                            <h2>New message</h2>
                            <p className="text-muted">Start a conversation</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="ds-btn ds-btn--icon"
                            aria-label="Close message window"
                        >
                            <X aria-hidden="true" />
                        </button>
                    </div>

                    <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-4">
                        <TextAreaField
                            label="Your message"
                            name="message"
                            value={text}
                            onChange={setText}
                            hint={`${text.length} characters`}
                        />

                        <FormError error={error} />

                        <SubmitButton pending={isSending} pendingLabel="Sending…">
                            Send message
                        </SubmitButton>
                    </form>
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="ds-btn ds-btn--primary"
            >
                {isOpen ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
                {isOpen ? 'Close' : 'Message'}
            </button>
        </div>
    )
}
