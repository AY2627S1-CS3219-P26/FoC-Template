import type { ReactNode } from 'react'

type SubmitButtonProps = {
  pending: boolean
  // Shown while the request runs, e.g. "Creating account…".
  pendingLabel?: string
  children: ReactNode
}

// Disabled while pending, so a second click cannot send the form twice.
export function SubmitButton({ pending, pendingLabel, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="ds-btn ds-btn--primary w-full"
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}