import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useRecommendation } from '@/api/recommendation/recommendations'
import { useCreateOrder } from '@/api/order/order'
import { Notice } from '@/components/Notice'
import { SubmitButton } from '@/components/SubmitButton'
import { Page } from '@/components/Page'
import type { Supplier } from '@/api/supplier/types'
import { SupplierThumbnail } from '../components/SupplierThumbnail'
import { PickUpList } from '../components/PickupList'
import { TextField } from '@/components/TextField'
import { ApiError, fieldErrorsOf } from '@/lib/http'
import { FormError } from '@/components/FormError'

// datetime-local expects "YYYY-MM-DDTHH:mm" in the browser's time. The default is the first
// full hour at least an hour from now, so on most days it is today.
function defaultNeededBy(now = new Date()): string {
  const at = new Date(now.getTime() + 60 * 60 * 1000)
  if (at.getMinutes() || at.getSeconds() || at.getMilliseconds()) at.setHours(at.getHours() + 1, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export function PostErrandPage() {
  const recommend = useRecommendation()
  const create = useCreateOrder()
  const ERRANDS_PATH = '/errands'
  const fieldErrors = fieldErrorsOf(create.error)

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const supplierId = supplier?.id ?? ''
  const [location, setLocation] = useState('')
  const [neededBy, setNeededBy] = useState(defaultNeededBy)
  const [itemsText, setItemsText] = useState('')
  const [credits, setCredits] = useState('')
  const [posted, setPosted] = useState(false)
  const [picking, setPicking] = useState(false)

  function suggest() {
    const items = itemsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    recommend.mutate(
      { supplierId, location, neededBy: neededBy ? new Date(neededBy).toISOString() : '', items },
      {
        onSuccess: (data) => {
          setCredits(String(data.recommendedCredits))
          console.log('recommendation factors', data.features)
        },
      },
    )
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) return

    const items = itemsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    // The order-service decides whether the time is valid and in the future, and names the field if not.
    const when = new Date(neededBy)
    create.mutate({
      supplierId,
      deliveryLocation: location.trim(),
      neededByTime: Number.isNaN(when.getTime())
        ? neededBy
        : when.toISOString(),
      itemLines: items,
      creditReward: Number(credits),
    },
    {
      onSuccess: () => setPosted(true),
    },
    )
  }

  function resetForm() {
    setSupplier(null)
    setLocation('')
    setNeededBy(defaultNeededBy())
    setItemsText('')
    setCredits('')
    setPosted(false)

    create.reset()
    recommend.reset()
  }

  const suggestion = recommend.data

  return (
    <Page title="Post an errand" subtitle="Describe the errand and set the credits you'll offer">
      {!posted ? (
        <form noValidate className="ds-surface grid max-w-xl gap-4 p-5" onSubmit={handleSubmit}>
          <FormError error={create.error} fields={['supplierId', 'deliveryLocation', 'neededByTime', 'itemLines', 'creditReward']} />
          {/* Choose pick up */}
          <div className="grid gap-2">
            <span>
              Picking up from
            </span>
            {supplier ? (
              <div className="flex items-center gap-3">
                <SupplierThumbnail supplier={supplier} />
                <div className="grid min-w-0 flex-1 gap-1">
                  <p className="wrap-anywhere">{supplier.name}</p>
                  <p className="text-sm text-muted wrap-anywhere">
                    {supplier.type} · {supplier.zone}
                  </p>
                </div>
                <button type="button" className="ds-btn ds-btn--glass shrink-0" onClick={() => setPicking(true)}>
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-labelledby="pickup-label"
                className="ds-btn ds-btn--glass justify-self-start"
                onClick={() => setPicking(true)}
              >
                Choose a pickup location
              </button>
            )}
            {fieldErrors.supplierId?.[0] && <p className='text-danger'>{fieldErrors.supplierId?.[0]}</p>}
          </div>
          <TextField
            label="Drop-off location"
            name="location"
            value={location}
            onChange={setLocation}
            hint="Where the errand ends, e.g. COM3 or Kent Ridge MRT"
            errors={fieldErrors.deliveryLocation}
          />
          <TextField label="Needed by" name="neededBy" type="datetime-local" value={neededBy} onChange={setNeededBy} errors={fieldErrors.neededByTime}/>
          <TextField label="Items" name="items" value={itemsText} onChange={setItemsText} hint="Comma-separated, e.g. coffee, sandwich" errors={fieldErrors.itemLines}/>

          <div className="grid gap-2">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TextField label="Credits" name="credits" value={credits} onChange={setCredits} inputMode="numeric" errors={fieldErrors.creditReward}/>
              </div>
              <button
                type="button"
                onClick={suggest}
                aria-disabled={recommend.isPending || undefined}
                className="ds-btn ds-btn--glass mb-1 shrink-0"
              >
                {recommend.isPending ? 'Suggesting…' : 'Suggest'}
              </button>
            </div>

            {suggestion && (
              <div className="grid gap-1 text-sm">
                <p className="text-muted">
                  Suggested <span className="font-medium text-default">{suggestion.recommendedCredits}</span>{' '}
                  {suggestion.basis === 'formula' ? 'from the market rate' : '(default for a new supplier)'}
                </p>
              </div>
            )}
            {recommend.isError && (
              <p className="text-sm text-danger">
                {recommend.error instanceof ApiError ? recommend.error.message : 'Could not get a suggestion.'}
              </p>
            )}
          </div>

          <SubmitButton
            pending={create.isPending}
            pendingLabel="Posting…"
          >
            Post errand
          </SubmitButton>
        </form>
       ) : (
        <div className="ds-surface grid grid-cols-1 gap-4 p-5">
          <Notice tone="success" role="status" title="Errand posted" />
          <p>Errand posted. You will find it under “My requests”.</p>
          <div className="flex flex-wrap gap-3">
            <a className="ds-btn ds-btn--primary" href={ERRANDS_PATH}>
              View my errands
            </a>
            <button
              type="button"
              className="ds-btn"
              onClick={resetForm}
            >
              Post another
            </button>
          </div>
        </div>
        ) 
      }
      {/* show the pick up list */}
      {picking && (
        <PickUpList
          selectedId={supplierId}
          onSelect={(chosen) => {
            setSupplier(chosen)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </Page>
  )
}
