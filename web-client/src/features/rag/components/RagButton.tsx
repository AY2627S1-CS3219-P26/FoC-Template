import { BotMessageSquare, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'

type RagButtonProps = {
    // The chat shown in the overlay. Passed in by the shell, because a feature may not import another feature.
    children: ReactNode
}

// A floating assistant button in the bottom right corner that opens a small chat overlay above it.
// On phones both sit above the floating tab bar.
export function RagButton({ children }: RagButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const panelId = useId()

    return (
        <>
            {/* Kept mounted while closed, so the conversation survives closing and reopening the overlay. */}
            <section
                id={panelId}
                aria-label="AI Help Assistant"
                hidden={!isOpen}
                className="ds-surface ds-surface--chrome fixed inset-x-4 bottom-44 z-30 flex h-136 flex-col overflow-hidden shadow-panel sm:left-auto sm:w-166 lg:right-6 lg:bottom-24 lg:h-228"
            >
                <header className="flex items-center justify-between gap-2 border-b border-border p-2 pl-4">
                    <h2 className="min-w-0 font-semibold">AI Help Assistant</h2>
                    <button
                        type="button"
                        className="ds-btn ds-btn--text ds-btn--icon"
                        aria-label="Close assistant"
                        onClick={() => setIsOpen(false)}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>
                {children}
            </section>

            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
                className="ds-btn ds-btn--primary fixed right-4 bottom-28 z-30 size-20 rounded-chip p-0 lg:right-6 lg:bottom-6"
            >
                {isOpen ? <X aria-hidden="true" /> : <BotMessageSquare aria-hidden="true" />}
            </button>
        </>
    )
}
