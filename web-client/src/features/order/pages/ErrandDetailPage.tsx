import { Link, useParams } from 'react-router'
import { useMyOrders, useOrder } from '@/api/order/order'
import type { Order, OrderStatus } from '@/api/order/order'
import { useSupplier } from '@/api/supplier/suppliers'
import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { QueryView } from '@/components/QueryView'
import { SupplierThumbnail } from '@/features/supplier/components/SupplierThumbnail'

const ERRANDS_PATH = '/errands'

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d)
}

// Status path

const FLOW: { status: OrderStatus; label: string }[] = [
  { status: 'Open', label: 'Posted' },
  { status: 'Accepted', label: 'Accepted by a courier' },
  { status: 'PickedUp', label: 'Items picked up' },
  { status: 'Delivered', label: 'Delivered' },
  { status: 'Completed', label: 'Confirmed and paid' },
]

type StepState = 'done' | 'current' | 'notReached' | 'ended'

type Step = { key: string; label: string; state: StepState; time?: string; note?: string }

/*
 * The order-service keeps only the current status, so earlier stages are worked out from the
 * rules of the lifecycle:
 *  - an errand can only be cancelled while Open or Accepted, and a courier is set once it is
 *    accepted, so a cancelled errand with a courier got as far as Accepted, one without did not;
 *  - an expired errand was never accepted.
 * Times are known only for posting (created_at) and for the latest change (updated_at).
 */
function stepsOf(order: Order): Step[] {
  const { status } = order
  const flowIndex = FLOW.findIndex((stage) => stage.status === status)

  if (status === 'Cancelled' || status === 'Expired') {
    const reached = status === 'Cancelled' && order.courier_id ? 2 : 1
    const endLabel = status === 'Cancelled' ? 'Cancelled' : 'Expired'
    const steps: Step[] = FLOW.map((stage, i) => ({
      key: stage.status,
      label: stage.label,
      state: i < reached ? 'done' : 'notReached',
      time: i === 0 ? order.created_at : undefined,
    }))
    steps.splice(reached, 0, {
      key: status,
      label: endLabel,
      state: 'ended',
      time: order.updated_at,
      note:
        status === 'Cancelled'
          ? 'The errand was cancelled. Reserved credits were released.'
          : 'Nobody accepted it in time. Reserved credits were released.',
    })
    return steps
  }

  return FLOW.map((stage, i): Step => {
    // Pending means the credits are still being reserved, so nothing has been reached yet.
    if (status === 'Pending') return { key: stage.status, label: stage.label, state: 'notReached' }
    const done = i < flowIndex || status === 'Completed'
    const current = i === flowIndex && status !== 'Completed'
    return {
      key: stage.status,
      label: stage.label,
      state: done ? 'done' : current ? 'current' : 'notReached',
      time: i === 0 ? order.created_at : current ? order.updated_at : status === 'Completed' && i === flowIndex ? order.updated_at : undefined,
    }
  })
}

const STATE_TEXT: Record<StepState, string> = {
  done: 'Done',
  current: 'Current',
  notReached: '',
  ended: 'Ended',
}

const MARKER: Record<StepState, { symbol: string; className: string }> = {
  done: { symbol: '✓', className: 'bg-accent text-on-accent' },
  current: { symbol: '●', className: 'border-2 border-accent bg-backdrop text-accent' },
  notReached: { symbol: '', className: 'border border-border bg-backdrop text-subtle' },
  ended: { symbol: '✕', className: 'bg-neutral-mark text-on-accent' },
}

function Progress({ order }: { order: Order }) {
  const steps = stepsOf(order)
  return (
    <section className="ds-surface grid grid-cols-1 gap-4 p-5" aria-labelledby="progress-title">
      <h2 id="progress-title">Progress</h2>
      {order.status === 'Pending' && <p className="text-sm text-muted">Reserving the reward credits…</p>}
      <ol aria-label="Errand progress" className="m-0 list-none p-0">
        {steps.map((step) => (
          <li
            key={step.key}
            className="relative pb-6 pl-10 before:absolute before:top-7 before:left-3.5 before:h-full before:w-px before:bg-border last:pb-0 last:before:hidden"
          >
            <span
              aria-hidden="true"
              className={`absolute top-0 left-0 grid size-7 place-items-center rounded-chip text-sm ${MARKER[step.state].className}`}
            >
              {MARKER[step.state].symbol}
            </span>
            <p className={step.state === 'notReached' ? 'text-muted' : 'font-[600]'}>{step.label}</p>
            <p className="text-sm text-muted">
              {STATE_TEXT[step.state]}
              {step.time && ` · ${formatDateTime(step.time)}`}
            </p>
            {step.note && <p className="mt-1 text-sm">{step.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Pickup
// ---------------------------------------------------------------------------

// Its own component because the hook needs the supplier id, which is known only once the errand has loaded.
function Pickup({ supplierId }: { supplierId: string }) {
  const supplier = useSupplier(supplierId)
  if (!supplier.data) return <p className="text-muted">Supplier {supplierId}</p>
  const s = supplier.data
  return (
    <div className="flex items-start gap-3">
      <SupplierThumbnail supplier={s} />
      <div className="grid min-w-0 gap-1">
        <p className="wrap-anywhere">{s.name}</p>
        <p className="text-sm text-muted wrap-anywhere">
          {s.type} · {s.zone} · {s.address}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Details({ order, role }: { order: Order; role: string | null }) {
  return (
    <section className="ds-surface grid grid-cols-1 gap-4 p-5" aria-labelledby="details-title">
      <h2 id="details-title">Details</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="ds-label">Pick up from</dt>
          <dd className="mt-1">
            <Pickup supplierId={order.supplier_id} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="ds-label">Deliver to</dt>
          <dd className="mt-1 wrap-anywhere">{order.delivery_location}</dd>
        </div>
        <div className="min-w-0">
          <dt className="ds-label">Needed by</dt>
          <dd className="mt-1">{formatDateTime(order.needed_by_time)}</dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="ds-label">Items</dt>
          <dd className="mt-1">
            <ul className="m-0 grid list-disc gap-1 pl-5">
              {order.item_lines.map((line, i) => (
                <li key={i} className="wrap-anywhere">
                  {line}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="ds-label">Reward</dt>
          <dd className="mt-1 font-[600]">{order.credit_reward} credits</dd>
        </div>
        {role && (
          <div className="min-w-0">
            <dt className="ds-label">Your role</dt>
            <dd className="mt-1">{role}</dd>
          </div>
        )}
        <div className="min-w-0">
          <dt className="ds-label">Posted</dt>
          <dd className="mt-1">{formatDateTime(order.created_at)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="ds-label">Last updated</dt>
          <dd className="mt-1">{formatDateTime(order.updated_at)}</dd>
        </div>
      </dl>
    </section>
  )
}

export function ErrandDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const validId = Number.isInteger(id) && id > 0

  const order = useOrder(validId ? id : 0)
  const mine = useMyOrders()
  const me = mine.data?.accountId
  const data = order.data
  const role = !data || !me ? null : data.requester_id === me ? 'Requester' : data.courier_id === me ? 'Courier' : null

  const back = (
    <Link to={ERRANDS_PATH} className="ds-btn ds-btn--glass">
      Back to errands
    </Link>
  )

  if (!validId) {
    return (
      <Page title="Errand">
        <EmptyState title="This errand does not exist" action={back} />
      </Page>
    )
  }

  return (
    <Page title={`Errand #${id}`} subtitle={data ? `${data.credit_reward} credits` : undefined}>
      <div>{back}</div>
      <QueryView
        query={order}
        loadingLabel="Loading errand"
        isEmpty={(result) => !result}
        empty={<EmptyState title="Errand not found" action={back} />}
      >
        {(result) => (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <Progress order={result} />
            <Details order={result} role={role} />
          </div>
        )}
      </QueryView>
    </Page>
  )
}
