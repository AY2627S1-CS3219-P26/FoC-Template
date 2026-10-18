import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useUpdateProfile } from '@/api/user/account'
import type { PublicUser } from '@/api/user/types'
import { FormError } from '@/components/FormError'
import { Notice } from '@/components/Notice'
import { SubmitButton } from '@/components/SubmitButton'
import { TextField } from '@/components/TextField'
import { formatDate } from '@/lib/format'
import { fieldErrorsOf } from '@/lib/http'

type EditProfileFormProps = {
  user: PublicUser
}

export function EditProfileForm({ user }: EditProfileFormProps) {
  const [values, setValues] = useState({ fullName: user.fullName, username: user.username })
  const update = useUpdateProfile()
  const fieldErrors = fieldErrorsOf(update.error)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    update.mutate(values)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="ds-surface grid grid-cols-1 content-start gap-4 p-5">
      <h2>Account</h2>
      {/* Shown, not editable: the user-service refuses changes to these (F1.4.3). */}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="ds-label">NUS email</dt>
          <dd className="mt-1 wrap-anywhere">{user.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="ds-label">Joined</dt>
          <dd className="mt-1">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
      {update.isSuccess && <Notice tone="success" role="status" title="Profile saved" />}
      <FormError error={update.error} fields={['fullName', 'username']} />
      <TextField
        label="Full name"
        name="fullName"
        autoComplete="name"
        value={values.fullName}
        onChange={(fullName) => setValues({ ...values, fullName })}
        errors={fieldErrors.fullName}
      />
      <TextField
        label="Username"
        name="username"
        autoComplete="username"
        value={values.username}
        onChange={(username) => setValues({ ...values, username })}
        errors={fieldErrors.username}
      />
      <SubmitButton pending={update.isPending} pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  )
}
