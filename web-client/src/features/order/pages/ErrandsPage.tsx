import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  describeOrderError,
  suppliersOf,
  useAcceptOrder,
  useMyOrders,
  useOpenOrders,
  useUpdateOrderStatus,
} from '@/api/order/order'
import type { Order, OrderStatus } from '@/api/order/order'
import { useSuppliers } from '@/api/supplier/suppliers'
import type { Supplier } from '@/api/supplier/types'
import { Notice } from '@/components/Notice'

/*
 * Errands page: browse open errands (courier), track the errands I requested,
 * and manage the ones I am delivering.
 *
 * The order-service owns every lifecycle rule. This page only shows the actions
 * that make sense for the viewer and surfaces whatever the service answers.
 */

type Tab = 'browse' | 'requests' | 'deliveries'
type Flash = { kind: 'ok' | 'error'; text: string }

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

const BADGE_TONE: Record<OrderStatus, string> = {
  Pending: 'bg-neutral-surface text-neutral',
  Open: 'bg-danger-surface text-danger',
  Accepted: 'bg-info-surface text-info',
  PickedUp: 'bg-info-surface text-info',
  Delivered: 'bg-info-surface text-info',
  Completed: 'bg-success-surface text-success',
  Cancelled: 'bg-neutral-surface text-neutral',
  Expired: 'bg-neutral-surface text-neutral',
}

const TABS = [
  ['browse', 'Browse open'],
  ['requests', 'My requests'],
  ['deliveries', 'My deliveries'],
] as const

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
  const [flash, setFlash] = useState<Flash | null>(null)
  const [busy, setBusy] = useState<number[]>([])
  const [now, setNow] = useState(() => Date.now())

  const openQuery = useOpenOrders()
  const mineQuery = useMyOrders()
  const suppliersQuery = useSuppliers({ page: 1, status: 'all' }) // only used to show supplier names; falls back to the id
  const acceptOrder = useAcceptOrder()
  const updateStatus = useUpdateOrderStatus()

  const openOrders = openQuery.data
  const myOrders = mineQuery.data?.orders
  const me = mineQuery.data?.accountId ?? null
  const suppliers: Supplier[] = suppliersOf(suppliersQuery.data)
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
    if (flash?.kind !== 'ok') return
    const t = window.setTimeout(() => setFlash(null), 5000)
    return () => window.clearTimeout(t)
  }, [flash])

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

  // The mutations refresh the order queries themselves (see @/api/order/order).
  async function run(orderId: number, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy((ids) => [...ids, orderId])
    try {
      await action()
      setFlash({ kind: 'ok', text: success })
    } catch (err) {
      setFlash({ kind: 'error', text: describeOrderError(err, failure) })
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
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 content-start gap-6 p-4 sm:p-6">
      <header className="grid gap-2">
        <h1>Errands</h1>
        <p className="opacity-70">Pick up errands for others and track the ones you have requested.</p>
      </header>

      {flash && (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Notice
              tone={flash.kind === 'ok' ? 'success' : 'info'}
              role={flash.kind === 'ok' ? 'status' : 'alert'}
              title={flash.text}
            />
          </div>
          <button type="button" className="ds-btn" aria-label="Dismiss" onClick={() => setFlash(null)}>
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4">
        <div role="tablist" aria-label="Errand views" className="flex gap-1 overflow-x-auto border-b border-current/15">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`errands-tab-${key}`}
              aria-selected={tab === key}
              aria-controls="errands-panel"
              onClick={() => setTab(key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 ${
                tab === key ? 'border-current font-semibold' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {label}
              <span className="ml-2 rounded-full bg-current/10 px-2 py-0.5 text-xs">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div id="errands-panel" role="tabpanel" aria-labelledby={`errands-tab-${tab}`} className="grid gap-4">
          {loading ? (
            <p className="p-8 text-center opacity-70">Loading errands…</p>
          ) : loadError && visible.length === 0 ? (
            <div className="grid justify-items-center gap-3 p-8 text-center" role="alert">
              <p>{loadError}</p>
              <button type="button" className="ds-btn" onClick={reload}>
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="p-8 text-center opacity-70">{emptyText(tab)}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
              {visible.map((order) => (
                <li key={order.id} className="min-w-0">
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
            <p className="text-sm text-amber-600 dark:text-amber-400" role="status">
              Showing the last loaded data: {loadError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function sortActiveFirst(orders: Order[]): Order[] {
  const rank = (o: Order) => (TERMINAL.includes(o.status) ? 1 : 0)
  return [...orders].sort(
    (a, b) => rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

function emptyText(tab: Tab): string {
  if (tab === 'browse') return 'No open errands right now. Check back soon.'
  if (tab === 'requests') return 'You have not requested anything yet. Use “Post an errand” to get started.'
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

type Variant = 'primary' | 'plain'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'ds-btn ds-btn--primary',
  plain: 'ds-btn',
}

function ErrandCard({ order, me, now, supplier, busy, onAccept, onStatus }: CardProps) {
  const isRequester = me !== null && order.requester_id === me
  const isCourier = me !== null && order.courier_id === me
  const pastDue = order.status === 'Open' && new Date(order.needed_by_time).getTime() < now
  const firstItems = order.item_lines.slice(0, 3)
  const extra = Math.max(0, order.item_lines.length - 3)

  function confirmThen(message: string, fn: () => void) {
    if (window.confirm(message)) fn()
  }

  const actions: ReactNode[] = []
  const button = (key: string, label: string, onClick: () => void, variant: Variant = 'plain') =>
    actions.push(
      <button key={key} type="button" className={VARIANT_CLASS[variant]} disabled={busy} onClick={onClick}>
        {label}
      </button>,
    )

  if (order.status === 'Open' && !isRequester) {
    button('accept', 'Accept errand', onAccept, 'primary')
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
        'primary',
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
        `Confirm delivery / Pay courier ${order.credit_reward} credits`,
        () =>
          confirmThen(`Confirm you received everything? ${order.credit_reward} credits go to your courier.`, () =>
            onStatus('Completed', 'Delivery confirmed. Credits are on their way to your courier.'),
          ),
        'primary',
      )
    }
  }
  if (isCourier) {
    if (order.status === 'Accepted') {
      button('picked', 'Mark picked up', () => onStatus('PickedUp', 'Marked as picked up.'), 'primary')
    }
    if (order.status === 'PickedUp') {
      button(
        'delivered',
        'Mark delivered',
        () => onStatus('Delivered', 'Marked as delivered. Waiting for the requester to confirm.'),
        'primary',
      )
    }
  }

  const note = statusNote(order, isRequester, isCourier)
  const muted = order.status === 'Cancelled' || order.status === 'Expired'

  return (
    <article
      aria-busy={busy}
      className={`ds-surface flex h-full flex-col gap-4 p-5 ${busy ? 'opacity-70' : muted ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="wrap-anywhere">{supplier}</h2>
        <span
          className={`shrink-0 rounded-full border border-current px-3 py-0.5 text-xs font-semibold ${BADGE_TONE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <ul className="m-0 grid list-disc gap-1 pl-5">
        {firstItems.map((line, i) => (
          <li key={i} className="wrap-anywhere">
            {line}
          </li>
        ))}
        {extra > 0 && <li className="list-none opacity-70">+{extra} more</li>}
      </ul>

      <dl className="m-0 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2">
        <dt className="ds-label">Deliver to</dt>
        <dd className="m-0 wrap-anywhere">{order.delivery_location}</dd>

        <dt className="ds-label">Needed by</dt>
        <dd className="m-0">
          {formatNeededBy(order.needed_by_time)}
          {!TERMINAL.includes(order.status) && (
            <span className={pastDue ? 'text-red-600 dark:text-red-400' : 'opacity-70'}>
              {' '}
              · {relativeTo(order.needed_by_time, now)}
            </span>
          )}
        </dd>

        <dt className="ds-label">Reward</dt>
        <dd className="m-0 font-semibold">{order.credit_reward} credits</dd>

        {isCourier && !isRequester && (
          <>
            <dt className="ds-label">Your role</dt>
            <dd className="m-0">Courier</dd>
          </>
        )}
      </dl>

      {note && <p className="text-sm opacity-70">{note}</p>}
      {actions.length > 0 && <div className="mt-auto flex flex-wrap gap-2">{actions}</div>}
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
