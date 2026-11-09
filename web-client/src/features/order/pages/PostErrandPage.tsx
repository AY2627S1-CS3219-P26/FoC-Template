import { useState } from 'react'
import { suppliersOf } from '@/api/order/order'
import { useSuppliers } from '@/api/supplier/suppliers'
import { Notice } from '@/components/Notice'
import { ErrandForm } from '@/features/order/components/ErrandForm'

// "Errands" route used for the links below; change it if your router uses another path.
const ERRANDS_PATH = '/errands'

export function PostErrandPage() {
  const suppliers = useSuppliers({ page: 1, status: 'all' })
  const [posted, setPosted] = useState(false)
  const [formKey, setFormKey] = useState(0) // remounting the form clears it for "Post another"

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-6 p-4 sm:p-6">
      <header className="grid gap-2">
        <h1>Post an errand</h1>
        <p className="opacity-70">Tell couriers what to pick up and where to bring it.</p>
      </header>

      {posted ? (
        <div className="ds-surface grid grid-cols-1 gap-4 p-5">
          <Notice tone="success" role="status" title="Errand posted" />
          <p>Couriers can see it now. You will find it under “My requests”.</p>
          <div className="flex flex-wrap gap-3">
            <a className="ds-btn ds-btn--primary" href={ERRANDS_PATH}>
              View my errands
            </a>
            <button
              type="button"
              className="ds-btn"
              onClick={() => {
                setPosted(false)
                setFormKey((key) => key + 1)
              }}
            >
              Post another
            </button>
          </div>
        </div>
      ) : (
        <ErrandForm key={formKey} suppliers={suppliersOf(suppliers.data)} onCreated={() => setPosted(true)} />
      )}
    </div>
  )
}
