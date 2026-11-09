import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { describeOrderError, orderFieldErrors, useCreateOrder } from '@/api/order'
import type { Supplier } from '@/api/order'

// Shared by the "Post an errand" page and the quick-post dialog on the Errands page.
// Styles live in pages/ErrandsPage.css; render inside an element with the `errands` class.

export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface ErrandFormProps {
  suppliers: Supplier[]
  onCreated: () => void
  onCancel?: () => void
  onSubmittingChange?: (submitting: boolean) => void
  submitLabel?: string
}

export function ErrandForm({ suppliers, onCreated, onCancel, onSubmittingChange, submitLabel = 'Post errand' }: ErrandFormProps) {
  const createOrder = useCreateOrder()
  const [supplierId, setSupplierId] = useState('')
  const [location, setLocation] = useState('')
  const [neededBy, setNeededBy] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000)))
  const [items, setItems] = useState<string[]>([''])
  const [reward, setReward] = useState('5')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    onSubmittingChange?.(submitting)
  }, [submitting, onSubmittingChange])

  function updateItem(index: number, value: string) {
    setItems((list) => list.map((item, i) => (i === index ? value : item)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return // a retried POST would create a second errand
    setError(null)
    setErrors({})

    const when = new Date(neededBy)
    if (Number.isNaN(when.getTime())) {
      setErrors({ neededByTime: 'Choose a valid date and time.' })
      return
    }

    setSubmitting(true)
    try {
      await createOrder.mutateAsync({
        supplierId,
        deliveryLocation: location.trim(),
        neededByTime: when.toISOString(),
        itemLines: items.map((i) => i.trim()).filter(Boolean),
        creditReward: Number(reward),
      })
      onCreated()
    } catch (err) {
      const fields = orderFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setError(describeOrderError(err, 'Could not post your errand.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="errand-form" onSubmit={submit}>
      {error && (
        <p className="errands__formerror" role="alert">
          {error}
        </p>
      )}

      <label className="field">
        <span>Pickup location</span>
        {suppliers.length > 0 ? (
          <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="" disabled>
              Choose a store or facility
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="Supplier ID"
          />
        )}
        {errors.supplierId && <small className="field__error">{errors.supplierId}</small>}
      </label>

      <label className="field">
        <span>Deliver to</span>
        <input
          required
          minLength={2}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. PGP Foyer"
        />
        {errors.deliveryLocation && <small className="field__error">{errors.deliveryLocation}</small>}
      </label>

      <label className="field">
        <span>Needed by</span>
        <input
          type="datetime-local"
          required
          min={toLocalInput(new Date())}
          value={neededBy}
          onChange={(e) => setNeededBy(e.target.value)}
        />
        {errors.neededByTime && <small className="field__error">{errors.neededByTime}</small>}
      </label>

      <fieldset className="field">
        <legend>Items</legend>
        {items.map((item, i) => (
          <div className="field__row" key={i}>
            <input
              aria-label={`Item ${i + 1}`}
              required={i === 0}
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={i === 0 ? 'e.g. Iced latte, less sweet' : 'Another item'}
            />
            {items.length > 1 && (
              <button
                type="button"
                className="errands__btn errands__btn--ghost"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setItems((list) => list.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {items.length < 10 && (
          <button
            type="button"
            className="errands__btn errands__btn--ghost"
            onClick={() => setItems((list) => [...list, ''])}
          >
            + Add item
          </button>
        )}
        {errors.itemLines && <small className="field__error">{errors.itemLines}</small>}
      </fieldset>

      <label className="field">
        <span>Credit reward for your courier</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          step={1}
          required
          value={reward}
          onChange={(e) => setReward(e.target.value)}
        />
        <small className="field__hint">Reserved from your balance now; paid when you confirm delivery.</small>
        {errors.creditReward && <small className="field__error">{errors.creditReward}</small>}
      </label>

      <div className="errands__dialogactions">
        {onCancel && (
          <button type="button" className="errands__btn" disabled={submitting} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="errands__btn errands__btn--primary" disabled={submitting}>
          {submitting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
