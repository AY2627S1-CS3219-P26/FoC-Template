import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useUsers } from '@/api/user/admin'
import type { AccountState, Role } from '@/api/user/types'
import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Pagination } from '@/components/Pagination'
import { QueryView } from '@/components/QueryView'
import { SelectField } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { formatDateTime } from '@/lib/format'

const pageSize = 20

const stateOptions = [
  { value: '', label: 'All states' },
  { value: 'Active', label: 'Active' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'PendingVerification', label: 'Pending verification' },
]

const roleBadges: Record<Role, { label: string; className: string }> = {
  member: { label: 'Member', className: 'ds-badge ds-badge--neutral' },
  administrator: { label: 'Administrator', className: 'ds-badge ds-badge--info' },
}

const stateBadges: Record<AccountState, { label: string; className: string }> = {
  Active: { label: 'Active', className: 'ds-badge ds-badge--success' },
  PendingVerification: { label: 'Pending verification', className: 'ds-badge ds-badge--info' },
  Suspended: { label: 'Suspended', className: 'ds-badge ds-badge--danger' },
}

export function AdminStudentsPage() {
  // Search, state and page live in the URL, so reload, back and a shared link keep them.
  // What is not a page number shows page 1; an unknown state is refused by the user-service.
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const state = searchParams.get('state') ?? ''
  const page = Math.max(1, Math.trunc(Number(searchParams.get('page'))) || 1)
  const users = useUsers({
    page,
    pageSize,
    q: q || undefined,
    state: (state || undefined) as AccountState | undefined,
  })
  const total = users.data?.total
  const filtered = Boolean(q || state)

  // The box holds what is typed until the search runs. When back, forward or "Clear filters"
  // change q in the URL, the box follows.
  const [search, setSearch] = useState(q)
  const [shownQ, setShownQ] = useState(q)
  if (shownQ !== q) {
    setShownQ(q)
    setSearch(q)
  }

  // A new filter always starts again at page 1.
  function setFilter(name: 'q' | 'state', value: string) {
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

  return (
    <Page title="Students" subtitle={total === undefined ? undefined : `${total} ${total === 1 ? 'account' : 'accounts'}`}>
      <form role="search" noValidate onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
        {/* No hint below the field: it would push the field above the select and button next to it. */}
        <TextField label="Name, username, email or id" name="q" type="search" value={search} onChange={setSearch} />
        <SelectField label="State" name="state" value={state} onChange={(value) => setFilter('state', value)} options={stateOptions} />
        <button type="submit" className="ds-btn ds-btn--glass">
          Search
        </button>
      </form>
      <QueryView
        query={users}
        loadingLabel="Loading accounts"
        isEmpty={(result) => result.items.length === 0}
        empty={
          total ? (
            <EmptyState
              title={`There is no page ${page}`}
              action={
                <button type="button" className="ds-btn ds-btn--glass" onClick={() => setPage(1)}>
                  Go to page 1
                </button>
              }
            />
          ) : (
            <EmptyState
              title={filtered ? 'No accounts match these filters' : 'No accounts yet'}
              action={
                <button type="button" className="ds-btn ds-btn--glass" onClick={() => setSearchParams({})}>
                  {filtered ? 'Clear filters' : 'Go to page 1'}
                </button>
              }
            />
          )
        }
      >
        {(result) => (
          <>
            {/* From md a table; it scrolls inside its own box if the columns need more room. */}
            <div className="ds-surface hidden overflow-x-auto md:block">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Username</th>
                    <th scope="col">NUS email</th>
                    <th scope="col">Roles</th>
                    <th scope="col">State</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="font-mono text-xs text-muted">{user.id}</p>
                      </td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <span key={role} className={roleBadges[role].className}>
                              {roleBadges[role].label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={stateBadges[user.state].className}>{stateBadges[user.state].label}</span>
                      </td>
                      <td className="nums-tabular">{formatDateTime(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Below md the same accounts as cards. */}
            <ul className="ds-surface ds-rows md:hidden">
              {result.items.map((user) => (
                <li key={user.id} className="grid grid-cols-1 gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 font-medium wrap-anywhere">{user.fullName}</p>
                    <span className={stateBadges[user.state].className}>{stateBadges[user.state].label}</span>
                  </div>
                  <p className="text-sm text-muted wrap-anywhere">
                    {user.username} · {user.email}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span key={role} className={roleBadges[role].className}>
                        {roleBadges[role].label}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted">Joined {formatDateTime(user.createdAt)}</p>
                  <p className="font-mono text-xs text-subtle wrap-anywhere">{user.id}</p>
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
