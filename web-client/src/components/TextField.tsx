import { useId } from 'react'

type TextFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  // The server's messages for this field, e.g. error.fieldErrors.email (N5.4).
  errors?: string[]
  hint?: string
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'numeric' | 'tel' | 'search' | 'url'
}

export function TextField({
  label,
  name,
  value,
  onChange,
  errors = [],
  hint,
  type = 'text',
  autoComplete,
  inputMode,
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const hasErrors = errors.length > 0
  // Screen readers read the hint and the error together with the label.
  const describedBy = [hint && hintId, hasErrors && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="ds-field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={hasErrors || undefined}
        aria-describedby={describedBy}
        className="ds-field"
      />
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {hasErrors && (
        <p id={errorId} className="ds-field-error">
          {errors.map(capitalize).join('. ')}
        </p>
      )}
    </div>
  )
}

// The services phrase field errors as "must be at least 8 characters".
function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1)
}