import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useFavoriteSupplierIds } from '@/api/supplier/favorites'
import { useSupplierFilterValues, useSuppliers } from '@/api/supplier/suppliers'
import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Pagination } from '@/components/Pagination'
import { QueryView } from '@/components/QueryView'
import { SelectField } from '@/components/SelectField'
import type { SelectOption } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { AvailabilityText } from '../components/AvailabilityText'
import { FavoriteButton } from '../components/FavoriteButton'
import { OpenBadge } from '../components/OpenBadge'
import { SupplierThumbnail } from '../components/SupplierThumbnail'

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
  const favorites = searchParams.get('favorites') === '1'
  // No status: the supplier-service lists only Active suppliers, the ones a student can pick.
  const suppliers = useSuppliers({
    q: q || undefined,
    type: type || undefined,
    zone: zone || undefined,
    favorites: favorites || undefined,
    page,
  })
  // Without these the menus offer only "All", and the search still works.
  const filterValues = useSupplierFilterValues()
  const favoriteIds = useFavoriteSupplierIds()
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
  function setFilter(name: 'q' | 'type' | 'zone' | 'favorites', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value)
      else params.delete(name)
      params.delete('page')
      return params
    })
  }

  function setToggle(name: 'favorites', on: boolean) {
    setFilter(name, on ? '1' : '')
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

  const searched = q !== '' || type !== '' || zone !== ''
  const filtered = searched || favorites

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
        <div className="flex flex-wrap items-end gap-4 md:col-span-3 lg:col-span-5">
          <div className="grid grid-cols-1 gap-2">
            <span id="supplier-show" className="ds-field-label">
              Show
            </span>
            {/* Toggles, not choices: each one narrows the list on its own. */}
            <div role="group" aria-labelledby="supplier-show" className="ds-segmented">
              <button type="button" aria-pressed={favorites} onClick={() => setToggle('favorites', !favorites)}>
                Favorites
              </button>
            </div>
          </div>
        </div>
      </form>

      <QueryView
        query={suppliers}
        loadingLabel="Loading suppliers"
        isEmpty={(result) => result.items.length === 0}
        empty={
          favorites && !searched && !total ? (
            <EmptyState
              title="No favorites yet"
              description="Tap the heart next to a supplier to keep it here."
              action={
                <button type="button" className="ds-btn ds-btn--glass" onClick={() => setToggle('favorites', false)}>
                  Show all suppliers
                </button>
              }
            />
          ) : (
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
          )
        }
      >
        {(result) => (
          <>
            <ul className="ds-surface ds-rows">
              {result.items.map((supplier) => (
                <li key={supplier.id} className="flex items-start">
                  {/* Most of the row is the link, so it is easy to hit on a phone. The heart sits
                      beside it, not inside, because a button may not be part of a link. */}
                  <Link
                    to={`/suppliers/${supplier.id}`}
                    state={{ backLabel: title }}
                    className="flex min-w-0 flex-1 items-start gap-3 py-4 pl-4"
                  >
                    <SupplierThumbnail supplier={supplier} />
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 wrap-anywhere">{supplier.name}</p>
                        <OpenBadge supplier={supplier} />
                      </div>
                      <p className="font-normal text-muted wrap-anywhere">
                        {supplier.type} · {supplier.zone} · {supplier.address}
                      </p>
                      <p className="text-sm font-normal text-ink">
                        <AvailabilityText availability={supplier.availability} />
                      </p>
                    </div>
                  </Link>
                  <div className="py-3 pr-3 pl-1">
                    <FavoriteButton supplier={supplier} favorite={favoriteIds.data?.has(supplier.id) ?? false} />
                  </div>
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
