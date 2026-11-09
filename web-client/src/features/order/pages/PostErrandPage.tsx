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
)}

// import { useSuppliers } from '@/api/supplier/suppliers'
// import { useRecommendation } from '@/api/recommendation/recommendations'
// import { Notice } from '@/components/Notice'
// import { Page } from '@/components/Page'
// import { SelectField } from '@/components/SelectField'
// import { TextField } from '@/components/TextField'
// import { ApiError } from '@/lib/http'

// const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`

// // datetime-local expects "YYYY-MM-DDTHH:mm" in the browser's time. The default is the first
// // full hour at least an hour from now, so on most days it is today.
// function defaultNeededBy(now = new Date()): string {
//   const at = new Date(now.getTime() + 60 * 60 * 1000)
//   if (at.getMinutes() || at.getSeconds() || at.getMilliseconds()) at.setHours(at.getHours() + 1, 0, 0, 0)
//   const pad = (n: number) => String(n).padStart(2, '0')
//   return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
// }

// export function PostErrandPage() {
//   const suppliers = useSuppliers({ page: 1 })
//   const recommend = useRecommendation()

//   const [supplierId, setSupplierId] = useState('')
//   const [location, setLocation] = useState('')
//   const [neededBy, setNeededBy] = useState(defaultNeededBy)
//   const [itemsText, setItemsText] = useState('')
//   const [credits, setCredits] = useState('')

//   const supplierOptions = [
//     { value: '', label: 'Select a supplier' },
//     ...(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
//   ]

//   function suggest() {
//     const items = itemsText
//       .split(',')
//       .map((item) => item.trim())
//       .filter(Boolean)
//     recommend.mutate(
//       { supplierId, location, neededBy: neededBy ? new Date(neededBy).toISOString() : '', items },
//       { onSuccess: (data) => setCredits(String(data.recommendedCredits)) },
//     )
//   }

//   const suggestion = recommend.data

//   return (
//     <Page title="Post an errand" subtitle="Describe the errand and set the credits you'll offer">
//       <form className="ds-surface grid max-w-xl gap-4 p-5" onSubmit={(event) => event.preventDefault()}>
//         <SelectField label="Supplier" name="supplierId" value={supplierId} onChange={setSupplierId} options={supplierOptions} />
//         <TextField
//           label="Drop-off location"
//           name="location"
//           value={location}
//           onChange={setLocation}
//           hint="Where the errand ends, e.g. COM3 or Kent Ridge MRT"
//         />
//         <TextField label="Needed by" name="neededBy" type="datetime-local" value={neededBy} onChange={setNeededBy} />
//         <TextField label="Items" name="items" value={itemsText} onChange={setItemsText} hint="Comma-separated, e.g. coffee, sandwich" />

//         <div className="grid gap-2">
//           <div className="flex items-end gap-3">
//             <div className="flex-1">
//               <TextField label="Credits" name="credits" value={credits} onChange={setCredits} inputMode="numeric" />
//             </div>
//             <button
//               type="button"
//               onClick={suggest}
//               aria-disabled={recommend.isPending || undefined}
//               className="ds-btn ds-btn--glass mb-1 shrink-0"
//             >
//               {recommend.isPending ? 'Suggesting…' : 'Suggest'}
//             </button>
//           </div>

//           {suggestion && (
//             <div className="grid gap-1 text-sm">
//               <p className="text-muted">
//                 Suggested <span className="font-medium text-default">{suggestion.recommendedCredits}</span>{' '}
//                 {suggestion.basis === 'formula' ? 'from the market rate' : '(default for a new supplier)'}
//               </p>
//               {suggestion.basis === 'formula' && (
//                 <p className="text-xs text-muted">
//                   Items {pct(suggestion.features.itemFactor)} · Urgency {pct(suggestion.features.urgencyFactor)} · Distance{' '}
//                   {pct(suggestion.features.distanceFactor)}
//                 </p>
//               )}
//             </div>
//           )}
//           {recommend.isError && (
//             <p className="text-sm text-danger">
//               {recommend.error instanceof ApiError ? recommend.error.message : 'Could not get a suggestion.'}
//             </p>
//           )}
//         </div>

//         <Notice tone="info" title="Posting isn't wired up yet">
//           Submitting the errand is handled by order-service and will connect here later. For now this page helps you decide the
//           credits to offer.
//         </Notice>
//       </form>
//     </Page>
//   )
// }
