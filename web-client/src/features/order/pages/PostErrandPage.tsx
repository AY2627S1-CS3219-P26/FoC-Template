import { useState } from 'react'
import { useSuppliers } from '@/api/order'
import { ErrandForm } from '@/features/order/components/ErrandForm'
import './ErrandsPage.css'

// "Errands" route used for the links below; change it if your router uses another path.
const ERRANDS_PATH = '/errands'

export function PostErrandPage() {
  const suppliers = useSuppliers() // swap for your existing supplier hook if you have one
  const [posted, setPosted] = useState(false)
  const [formKey, setFormKey] = useState(0) // remounting the form clears it for "Post another"

  return (
    <section className="errands" aria-labelledby="post-errand-title">
      <header className="errands__header">
        <div>
          <h1 id="post-errand-title">Post an errand</h1>
          <p className="errands__sub">
            Tell couriers what to pick up and where to bring it. The reward is reserved from your credits when you post
            and paid to your courier when you confirm delivery.
          </p>
        </div>
      </header>

      <div className="errands__postcard">
        {posted ? (
          <div className="errands__success" role="status">
            <h2>Errand posted</h2>
            <p>Couriers can see it now. You will find it under “My requests”.</p>
            <div className="errands__dialogactions">
              <button
                type="button"
                className="errands__btn"
                onClick={() => {
                  setPosted(false)
                  setFormKey((k) => k + 1)
                }}
              >
                Post another
              </button>
              <a className="errands__btn errands__btn--primary" href={ERRANDS_PATH}>
                View my errands
              </a>
            </div>
          </div>
        ) : (
          <ErrandForm key={formKey} suppliers={suppliers.data ?? []} onCreated={() => setPosted(true)} />
        )}
      </div>
    </section>
  )
}
