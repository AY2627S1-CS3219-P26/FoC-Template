import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useCreateOrder } from '@/api/order/order'
import type { Supplier } from '@/api/supplier/types'
import { FormError } from '@/components/FormError'
import { SubmitButton } from '@/components/SubmitButton'
import { TextField } from '@/components/TextField'
import { fieldErrorsOf } from '@/lib/http'

export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// TextField handles its own errors; the plain inputs below show theirs through this.
function firstError(errors: unknown): string | undefined {
  if (Array.isArray(errors)) return typeof errors[0] === 'string' ? errors[0] : undefined
  return typeof errors === 'string' ? errors : undefined
}

const inputClass = 'w-full rounded-lg border border-current/25 bg-transparent px-3 py-2'

type ErrandFormProps = {
  suppliers: Supplier[]
  onCreated: () => void
}

export function ErrandForm({ suppliers, onCreated }: ErrandFormProps) {
  const create = useCreateOrder()
  const fieldErrors = fieldErrorsOf(create.error)

  const [supplierId, setSupplierId] = useState('')
  const [location, setLocation] = useState('')
  const [neededBy, setNeededBy] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000)))
  const [items, setItems] = useState<string[]>([''])
  const [reward, setReward] = useState('5')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) return // a repeated POST would create a second errand
    const when = new Date(neededBy)
    create.mutate(
      {
        supplierId,
        deliveryLocation: location.trim(),
        neededByTime: Number.isNaN(when.getTime()) ? neededBy : when.toISOString(),
        itemLines: items.map((item) => item.trim()).filter(Boolean),
        creditReward: Number(reward),
      },
      { onSuccess: onCreated },
    )
  }

  const activeSuppliers = suppliers.filter((s) => s.status === 'Active') // inactive ones cannot take errands

  return (
    <form noValidate onSubmit={handleSubmit} className="ds-surface grid grid-cols-1 content-start gap-5 p-5">
      <FormError
        error={create.error}
        fields={['supplierId', 'deliveryLocation', 'neededByTime', 'itemLines', 'creditReward']}
      />

      <div className="grid grid-cols-1 gap-4">
        <label className="grid gap-1">
          <span className="ds-label">Pickup location</span>
          {activeSuppliers.length > 0 ? (
            <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="" disabled>
                Choose pickup spot
              </option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="Supplier ID"
            />
          )}
          {firstError(fieldErrors.supplierId) && (
            <span className="text-sm text-red-600">{firstError(fieldErrors.supplierId)}</span>
          )}
        </label>

        <TextField
          label="Deliver to"
          name="deliveryLocation"
          value={location}
          onChange={setLocation}
          errors={fieldErrors.deliveryLocation}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
        <label className="grid gap-1">
          <span className="ds-label">Needed by</span>
          <input
            type="datetime-local"
            className={inputClass}
            min={toLocalInput(new Date())}
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
          {firstError(fieldErrors.neededByTime) && (
            <span className="text-sm text-red-600">{firstError(fieldErrors.neededByTime)}</span>
          )}
        </label>
      </div>

      <fieldset className="grid min-w-0 gap-2 border-0 p-0">
        <legend className="ds-label mb-1">Items</legend>
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              aria-label={`Item ${index + 1}`}
              className={inputClass}
              value={item}
              placeholder={index === 0 ? 'e.g. Iced latte, less sweet' : 'Another item'}
              onChange={(e) => setItems(items.map((v, i) => (i === index ? e.target.value : v)))}
            />
            {items.length > 1 && (
              <button
                type="button"
                className="ds-btn"
                aria-label={`Remove item ${index + 1}`}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {firstError(fieldErrors.itemLines) && (
          <span className="text-sm text-red-600">{firstError(fieldErrors.itemLines)}</span>
        )}
        {items.length < 10 && (
          <button type="button" className="ds-btn justify-self-start" onClick={() => setItems([...items, ''])}>
            + Add item
          </button>
        )}
      </fieldset>

      <label className="grid gap-1">
          <span className="ds-label">Reward (credits)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            step={1}
            className={inputClass}
            value={reward}
            onChange={(e) => setReward(e.target.value)}
          />
          {firstError(fieldErrors.creditReward) && (
            <span className="text-sm text-red-600">{firstError(fieldErrors.creditReward)}</span>
          )}
      </label>

      <p className="text-sm opacity-70">
        The reward is reserved from your credits now and paid to your courier when you confirm delivery.
      </p>

      <SubmitButton pending={create.isPending} pendingLabel="Posting…">
        Post errand
      </SubmitButton>
    </form>
  )
}
