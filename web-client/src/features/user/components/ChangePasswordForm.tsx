import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useChangePassword } from '@/api/user/account'
import { FormError } from '@/components/FormError'
import { Notice } from '@/components/Notice'
import { SubmitButton } from '@/components/SubmitButton'
import { TextField } from '@/components/TextField'
import { fieldErrorsOf } from '@/lib/http'

const empty = { currentPassword: '', newPassword: '' }

export function ChangePasswordForm() {
  const [values, setValues] = useState(empty)
  const change = useChangePassword()
  const fieldErrors = fieldErrorsOf(change.error)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // The fields are cleared only on success; a refused change keeps what was typed (N5.4).
    change.mutate(values, { onSuccess: () => setValues(empty) })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="ds-surface grid grid-cols-1 content-start gap-4 p-5">
      <h2>Change password</h2>
      <p className="text-muted">You stay logged in here. Every other device is logged out.</p>
      {change.isSuccess && <Notice tone="success" role="status" title="Password changed" />}
      <FormError error={change.error} fields={['currentPassword', 'newPassword']} />
      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        value={values.currentPassword}
        onChange={(currentPassword) => setValues({ ...values, currentPassword })}
        errors={fieldErrors.currentPassword}
      />
      <TextField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={(newPassword) => setValues({ ...values, newPassword })}
        errors={fieldErrors.newPassword}
      />
      <SubmitButton pending={change.isPending} pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </form>
  )
}
