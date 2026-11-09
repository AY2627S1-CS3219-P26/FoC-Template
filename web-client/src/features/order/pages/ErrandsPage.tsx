import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  describeOrderError,
  useAcceptOrder,
  useMyOrders,
  useOpenOrders,
  useSuppliers,
  useUpdateOrderStatus,
} from '@/api/order/order'
import type { Order, OrderStatus, Supplier } from '@/api/order/order'
import { ErrandForm } from '@/features/order/components/ErrandForm'
import './ErrandsPage.css'

/*
 * Errands page: browse open errands (courier), track the errands I requested,
 * and manage the ones I am delivering.
 *
 * The order-service owns every lifecycle rule. This page only shows the actions
 * that make sense for the viewer and surfaces whatever the service answers.
 */

type Tab = 'browse' | 'requests' | 'deliveries'
type Notice = { kind: 'ok' | 'error'; text: string }

const TERMINAL: OrderStatus[] = ['Completed', 'Cancelled', 'Expired']

const STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: 'Pending',
  Open: 'Open',
  Accepted: 'Accepted',
  PickedUp: 'Picked up',
  Delivered: 'Delivered',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Expired: 'Expired',
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

function formatNeededBy(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
}

function relativeTo(iso: string, now: number): string {
  const diffMin = Math.round((new Date(iso).getTime() - now) / 60_000)
  const abs = Math.abs(diffMin)
  const span =
    abs < 60 ? `${abs} min` : abs < 60 * 48 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`
  return diffMin >= 0 ? `in ${span}` : `${span} overdue`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ErrandsPage() {
  const [tab, setTab] = useState<Tab>('browse')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState<number[]>([])
  const [showForm, setShowForm] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const openQuery = useOpenOrders()
  const mineQuery = useMyOrders()
  const suppliersQuery = useSuppliers() // names fall back to ids; the form falls back to a text field
  const acceptOrder = useAcceptOrder()
  const updateStatus = useUpdateOrderStatus()

  const openOrders = openQuery.data
  const myOrders = mineQuery.data?.orders
  const me = mineQuery.data?.accountId ?? null
  const suppliers: Supplier[] = suppliersQuery.data ?? []
  const loading = openQuery.isLoading || mineQuery.isLoading
  const loadFailure = openQuery.error ?? mineQuery.error
  const loadError = loadFailure ? describeOrderError(loadFailure, 'Could not load errands.') : null
  const reload = () => void Promise.all([openQuery.refetch(), mineQuery.refetch()])

  // Keep "in 5 min" / "overdue" labels fresh between refetches.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const t = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(t)
  }, [notice])

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? `Supplier ${id}`

  const requests = useMemo(
    () => sortActiveFirst((myOrders ?? []).filter((o) => o.requester_id === me)),
    [myOrders, me],
  )
  const deliveries = useMemo(
    () => sortActiveFirst((myOrders ?? []).filter((o) => o.courier_id === me)),
    [myOrders, me],
  )
  const browse = useMemo(
    () =>
      [...(openOrders ?? [])].sort(
        (a, b) => new Date(a.needed_by_time).getTime() - new Date(b.needed_by_time).getTime(),
      ),
    [openOrders],
  )

  const visible = tab === 'browse' ? browse : tab === 'requests' ? requests : deliveries

  // The mutations refresh the order queries themselves (see @/api/order).
  async function run(orderId: number, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy((ids) => [...ids, orderId])
    try {
      await action()
      setNotice({ kind: 'ok', text: success })
    } catch (err) {
      setNotice({ kind: 'error', text: describeOrderError(err, failure) })
    } finally {
      setBusy((ids) => ids.filter((id) => id !== orderId))
    }
  }

  const accept = (order: Order) =>
    run(
      order.id,
      () => acceptOrder.mutateAsync(order.id),
      `Accepted. Head to ${supplierName(order.supplier_id)} to pick up the items.`,
      'Could not accept this errand.',
    )

  const setStatus = (order: Order, status: OrderStatus, success: string) =>
    run(order.id, () => updateStatus.mutateAsync({ id: order.id, status }), success, 'Could not update this errand.')

  const counts = { browse: browse.length, requests: requests.length, deliveries: deliveries.length }

  return (
    <section className="errands" aria-labelledby="errands-title">
      <header className="errands__header">
        <div>
          <h1 id="errands-title">Errands</h1>
          <p className="errands__sub">Pick things up for others, or ask someone to pick something up for you.</p>
        </div>
        <button type="button" className="errands__btn errands__btn--primary" onClick={() => setShowForm(true)}>
          + New errand
        </button>
      </header>

      {notice && (
        <div
          className={`errands__notice errands__notice--${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="errands__tabs" role="tablist" aria-label="Errand views">
        {(
          [
            ['browse', 'Browse open'],
            ['requests', 'My requests'],
            ['deliveries', 'My deliveries'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`errands-tab-${key}`}
            aria-selected={tab === key}
            aria-controls="errands-panel"
            className={`errands__tab${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label} <span className="errands__count">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div id="errands-panel" role="tabpanel" aria-labelledby={`errands-tab-${tab}`}>
        {loading ? (
          <p className="errands__empty">Loading errands…</p>
        ) : loadError && visible.length === 0 ? (
          <div className="errands__empty" role="alert">
            <p>{loadError}</p>
            <button type="button" className="errands__btn" onClick={reload}>
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="errands__empty">{emptyText(tab)}</p>
        ) : (
          <ul className="errands__list">
            {visible.map((order) => (
              <li key={order.id}>
                <ErrandCard
                  order={order}
                  me={me}
                  now={now}
                  supplier={supplierName(order.supplier_id)}
                  busy={busy.includes(order.id)}
                  onAccept={() => void accept(order)}
                  onStatus={(status, success) => void setStatus(order, status, success)}
                />
              </li>
            ))}
          </ul>
        )}
        {loadError && visible.length > 0 && (
          <p className="errands__stale" role="status">
            Showing the last loaded data: {loadError}
          </p>
        )}
      </div>

      {showForm && (
        <CreateErrandDialog
          suppliers={suppliers}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            setNotice({ kind: 'ok', text: 'Errand posted. Couriers can now see it.' })
            setTab('requests')
          }}
        />
      )}
    </section>
  )
}

function sortActiveFirst(orders: Order[]): Order[] {
  const rank = (o: Order) => (TERMINAL.includes(o.status) ? 1 : 0)
  return [...orders].sort(
    (a, b) => rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

function emptyText(tab: Tab): string {
  if (tab === 'browse') return 'No open errands right now. Check back soon, or post your own.'
  if (tab === 'requests') return 'You have not requested anything yet. Use “New errand” to get started.'
  return 'You are not delivering anything. Accept an errand from “Browse open”.'
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  order: Order
  me: string | null
  now: number
  supplier: string
  busy: boolean
  onAccept: () => void
  onStatus: (status: OrderStatus, success: string) => void
}

function ErrandCard({ order, me, now, supplier, busy, onAccept, onStatus }: CardProps) {
  const isRequester = me !== null && order.requester_id === me
  const isCourier = me !== null && order.courier_id === me
  const pastDue = order.status === 'Open' && new Date(order.needed_by_time).getTime() < now
  const [firstItems, extra] = [order.item_lines.slice(0, 3), Math.max(0, order.item_lines.length - 3)]

  function confirmThen(message: string, fn: () => void) {
    if (window.confirm(message)) fn()
  }

  const actions: ReactNode[] = []
  const button = (key: string, label: string, onClick: () => void, variant = '') =>
    actions.push(
      <button
        key={key}
        type="button"
        className={`errands__btn ${variant}`.trim()}
        disabled={busy}
        onClick={onClick}
      >
        {label}
      </button>,
    )

  if (order.status === 'Open' && !isRequester) {
    button('accept', 'Accept errand', onAccept, 'errands__btn--primary')
  }
  if (isRequester) {
    if (order.status === 'Open' || order.status === 'Accepted') {
      button(
        'cancel',
        'Cancel request',
        () =>
          confirmThen('Cancel this errand? Your reserved credits will be released.', () =>
            onStatus('Cancelled', 'Errand cancelled. Your credits are being released.'),
          ),
        'errands__btn--danger',
      )
    }
    if (pastDue) {
      button('expire', 'Mark expired', () =>
        confirmThen('Mark this errand as expired? Your reserved credits will be released.', () =>
          onStatus('Expired', 'Errand marked expired. Your credits are being released.'),
        ),
      )
    }
    if (order.status === 'Delivered') {
      button(
        'complete',
        `Confirm delivery · pay ${order.credit_reward}`,
        () =>
          confirmThen(`Confirm you received everything? ${order.credit_reward} credits go to your courier.`, () =>
            onStatus('Completed', 'Delivery confirmed. Credits are on their way to your courier.'),
          ),
        'errands__btn--primary',
      )
    }
  }
  if (isCourier) {
    if (order.status === 'Accepted') {
      button('picked', 'Mark picked up', () => onStatus('PickedUp', 'Marked as picked up.'), 'errands__btn--primary')
    }
    if (order.status === 'PickedUp') {
      button('delivered', 'Mark delivered', () => onStatus('Delivered', 'Marked as delivered. Waiting for the requester to confirm.'), 'errands__btn--primary')
    }
  }

  const note = statusNote(order, isRequester, isCourier)

  return (
    <article className={`errand errand--${order.status.toLowerCase()}`} aria-busy={busy}>
      <div className="errand__top">
        <h2 className="errand__supplier">{supplier}</h2>
        <span className={`errand__badge errand__badge--${order.status.toLowerCase()}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <ul className="errand__items">
        {firstItems.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
        {extra > 0 && <li className="errand__more">+{extra} more</li>}
      </ul>

      <dl className="errand__meta">
        <div>
          <dt>Deliver to</dt>
          <dd>{order.delivery_location}</dd>
        </div>
        <div>
          <dt>Needed by</dt>
          <dd>
            {formatNeededBy(order.needed_by_time)}
            {!TERMINAL.includes(order.status) && (
              <span className={`errand__rel${pastDue ? ' is-late' : ''}`}> · {relativeTo(order.needed_by_time, now)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Reward</dt>
          <dd className="errand__reward">{order.credit_reward} credits</dd>
        </div>
        {isCourier && !isRequester && (
          <div>
            <dt>Your role</dt>
            <dd>Courier</dd>
          </div>
        )}
      </dl>

      {note && <p className="errand__note">{note}</p>}
      {actions.length > 0 && <div className="errand__actions">{actions}</div>}
    </article>
  )
}

function statusNote(order: Order, isRequester: boolean, isCourier: boolean): string | null {
  switch (order.status) {
    case 'Pending':
      return 'Reserving credits…'
    case 'Open':
      return isRequester ? 'Waiting for a courier to accept.' : null
    case 'Accepted':
      return isRequester ? 'A courier is on the way to the pickup point.' : isCourier ? 'Go pick up the items.' : null
    case 'PickedUp':
      return isRequester ? 'Your items have been picked up.' : isCourier ? 'Deliver the items to the drop-off location.' : null
    case 'Delivered':
      return isRequester ? 'Delivered. Confirm to pay your courier.' : isCourier ? 'Waiting for the requester to confirm.' : null
    case 'Completed':
      return isCourier ? 'Done. Your reward has been requested.' : 'Done. Credits sent to your courier.'
    case 'Cancelled':
      return 'Cancelled. Reserved credits are released.'
    case 'Expired':
      return 'Expired. Reserved credits are released.'
  }
}

// ---------------------------------------------------------------------------
// Quick-post dialog (the full form lives in components/ErrandForm)
// ---------------------------------------------------------------------------

interface DialogProps {
  suppliers: Supplier[]
  onClose: () => void
  onCreated: () => void
}

function CreateErrandDialog({ suppliers, onClose, onCreated }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="errands__dialog"
      aria-labelledby="errand-form-title"
      onClose={onClose}
      onCancel={(e) => {
        if (submitting) e.preventDefault()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !submitting) ref.current?.close()
      }}
    >
      <h2 id="errand-form-title">New errand</h2>
      <ErrandForm
        suppliers={suppliers}
        onCreated={onCreated}
        onCancel={() => ref.current?.close()}
        onSubmittingChange={setSubmitting}
      />
    </dialog>
  )
}
