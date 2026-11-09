
import { useState, type SubmitEvent } from 'react'
import { postMessage } from '@/api/message/message'

type MessageErrandProps = {
    receiverId: string
}

export function MessageErrand({ receiverId }: MessageErrandProps) {
    const [text, setText] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!text.trim() || isSending) return

        setIsSending(true)
        setError('')

        try {
            await postMessage(text.trim(), receiverId)
            setText('')
            setIsOpen(false)
        } catch (err) {
            setError('Failed to send message. Please try again.')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

            <h1>fsdflk</h1>
            {isOpen && (
                <div className="w-[calc(100vw-3rem)] max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.8}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 10h8m-8 4h5M21 12a9 9 0 01-9 9 9.8 9.8 0 01-4-.9L3 21l.9-5A9 9 0 1121 12z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    New message
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Start a conversation
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                            aria-label="Close message window"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Message form */}
                    <form onSubmit={handleSubmit} className="p-5">
                        <label
                            htmlFor="message-input"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Your message
                        </label>

                        <textarea
                            id="message-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write your message here..."
                            rows={4}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />

                        {error && (
                            <p role="alert" className="mt-2 text-xs text-red-500">
                                {error}
                            </p>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {text.length} characters
                            </span>

                            <button
                                type="submit"
                                disabled={!text.trim() || isSending}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSending ? 'Sending...' : 'Send message'}
                                {!isSending && <span>➤</span>}
                            </button>
                        </div>
                    </form>
                </div>
            )}


            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl active:scale-95"
            >
                <span className="text-lg">
                    {isOpen ? '✕' : '✉'}
                </span>
                <span className="text-sm">
                    {isOpen ? 'Close' : 'Message'}
                </span>
            </button>
        </div>
    )
}
