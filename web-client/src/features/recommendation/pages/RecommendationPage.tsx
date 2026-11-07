import { useState } from 'react'
import { useSuppliers } from '@/api/supplier/suppliers'
import { useRecommendation } from '@/api/recommendation/recommendations'
import { Page } from '@/components/Page'
import { SelectField } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { SubmitButton } from '@/components/SubmitButton'
import { ApiError } from '@/lib/http'

export function RecommendationPage() {
  const suppliers = useSuppliers({ page: 1 })
  const recommend = useRecommendation()

  const [supplierId, setSupplierId] = useState('')
  const [location, setLocation] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [itemsText, setItemsText] = useState('')

  const supplierOptions = [
    { value: '', label: 'Select a supplier' },
    ...(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
  ]

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const items = itemsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    recommend.mutate({
      supplierId,
      location,
      neededBy: neededBy ? new Date(neededBy).toISOString() : '',
      items,
    })
  }

  const result = recommend.data

  return (
    <Page title="Credit suggestion" subtitle="See how many credits to offer for an errand">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="ds-surface grid gap-4 p-5">
          <SelectField
            label="Supplier"
            name="supplierId"
            value={supplierId}
            onChange={setSupplierId}
            options={supplierOptions}
          />
          <TextField
            label="Drop-off location"
            name="location"
            value={location}
            onChange={setLocation}
            hint="Where the errand ends, e.g. COM3 or Kent Ridge MRT"
          />
          <TextField
            label="Needed by"
            name="neededBy"
            type="datetime-local"
            value={neededBy}
            onChange={setNeededBy}
          />
          <TextField
            label="Items"
            name="items"
            value={itemsText}
            onChange={setItemsText}
            hint="Comma-separated, e.g. coffee, sandwich"
          />
          <SubmitButton pending={recommend.isPending} pendingLabel="Calculating…">
            Suggest credits
          </SubmitButton>
          {recommend.isError && (
            <p className="text-sm text-danger">
              {recommend.error instanceof ApiError ? recommend.error.message : 'Could not get a suggestion.'}
            </p>
          )}
        </form>

        {result && (
          <section className="ds-surface grid content-start gap-4 p-5">
            <div className="grid gap-1">
              <span className="ds-label">Suggested credits</span>
              <p className="nums-tabular text-5xl font-semibold">{result.recommendedCredits}</p>
              <span
                className={
                  result.basis === 'formula' ? 'ds-badge ds-badge--success' : 'ds-badge ds-badge--neutral'
                }
              >
                {result.basis === 'formula' ? 'From market rate' : 'Default (new supplier)'}
              </span>
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Market rate</dt>
                <dd className="nums-tabular">{result.features.marketRate.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Multiplier</dt>
                <dd className="nums-tabular">{result.features.multiplier.toFixed(2)}×</dd>
              </div>
            </dl>
            <p className="text-xs text-muted">Scorer {result.version}</p>
          </section>
        )}
      </div>
    </Page>
  )
}
