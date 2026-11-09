import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useSupplierFilterValues, useSuppliers } from '@/api/supplier/suppliers'
import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Pagination } from '@/components/Pagination'
import { QueryView } from '@/components/QueryView'
import { SelectField } from '@/components/SelectField'
import type { SelectOption } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { AvailabilityText } from '../components/AvailabilityText'
import { OpenBadge } from '../components/OpenBadge'

const title = 'Pick up from'

// A value from an old or shared link that no Active supplier uses now still shows as chosen,
// so the menu never claims a filter that is not applied.
function optionsOf(values: string[] | undefined, current: string, allLabel: string): SelectOption[] {
  const known = values ?? []
  const shown = current && !known.includes(current) ? [...known, current] : known
  return [{ value: '', label: allLabel }, ...shown.map((value) => ({ value, label: value }))]
}

export function SuppliersPage() {
  // Search, filters and page live in the URL, so reload, back and a shared link keep them.
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const type = searchParams.get('type') ?? ''
  const zone = searchParams.get('zone') ?? ''
  // The address bar can hold anything. What is not a page number from 1 shows page 1.
  const page = Math.max(1, Math.trunc(Number(searchParams.get('page'))) || 1)
  // No status: the supplier-service lists only Active suppliers, the ones a student can pick.
  const suppliers = useSuppliers({ q: q || undefined, type: type || undefined, zone: zone || undefined, page })
  // Without these the menus offer only "All", and the search still works.
  const filterValues = useSupplierFilterValues()
  const total = suppliers.data?.total

  // The box holds what is typed until the search runs. When back, forward or "Clear filters"
  // change q in the URL, the box follows.
  const [search, setSearch] = useState(q)
  const [shownQ, setShownQ] = useState(q)
  if (shownQ !== q) {
    setShownQ(q)
    setSearch(q)
  }

  // A new filter always starts again at page 1.
  function setFilter(name: 'q' | 'type' | 'zone', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value)
      else params.delete(name)
      params.delete('page')
      return params
    })
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilter('q', search.trim())
  }

  function setPage(next: number) {
    setSearchParams((params) => {
      params.set('page', String(next))
      return params
    })
  }

  const filtered = q !== '' || type !== '' || zone !== ''

  return (
    <Page title={title} subtitle={total === undefined ? undefined : `${total} ${total === 1 ? 'supplier' : 'suppliers'}`}>
      <form role="search" noValidate onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end lg:grid-cols-5">
        <div className="md:col-span-3 lg:col-span-2">
          {/* No hint below the box: it would push the menus and the button out of line with it. */}
          <TextField label="Search name, type, place or address" name="q" type="search" value={search} onChange={setSearch} />
        </div>
        <SelectField
          label="Type"
          name="type"
          value={type}
          onChange={(value) => setFilter('type', value)}
          options={optionsOf(filterValues.data?.types, type, 'All types')}
        />
        <SelectField
          label="Zone"
          name="zone"
          value={zone}
          onChange={(value) => setFilter('zone', value)}
          options={optionsOf(filterValues.data?.zones, zone, 'All zones')}
        />
        <button type="submit" className="ds-btn ds-btn--glass">
          Search
        </button>
      </form>

      <QueryView
        query={suppliers}
        loadingLabel="Loading suppliers"
        isEmpty={(result) => result.items.length === 0}
        empty={
          <EmptyState
            title={filtered ? 'No suppliers match these filters' : total ? `There is no page ${page}` : 'No suppliers yet'}
            action={
              filtered || total ? (
                <button type="button" className="ds-btn ds-btn--glass" onClick={() => setSearchParams({})}>
                  {filtered ? 'Clear filters' : 'Go to page 1'}
                </button>
              ) : (
                <Link to="/errands" className="ds-btn ds-btn--glass">
                  Browse errands
                </Link>
              )
            }
          />
        }
      >
        {(result) => (
          <>
            <ul className="ds-surface ds-rows">
              {result.items.map((supplier) => (
                <li key={supplier.id}>
                  {/* The whole row is the link, so it is easy to hit on a phone. */}
                  <Link
                    to={`/suppliers/${supplier.id}`}
                    state={{ backLabel: title }}
                    className="flex items-start justify-between gap-3 p-4"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-1">
                      <p className="wrap-anywhere">{supplier.name}</p>
                      <p className="font-normal text-muted wrap-anywhere">
                        {supplier.type} · {supplier.zone} · {supplier.address}
                      </p>
                      <p className="text-sm font-normal text-ink">
                        <AvailabilityText availability={supplier.availability} />
                      </p>
                    </div>
                    <OpenBadge supplier={supplier} />
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
          </>
        )}
      </QueryView>
    </Page>
  )
}
