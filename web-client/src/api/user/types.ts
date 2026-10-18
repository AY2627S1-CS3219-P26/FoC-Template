// Mirrors toPublicUser() in user-service/src/models/user.model.ts. Change both together.

export type Role = 'member' | 'administrator'

export type AccountState = 'PendingVerification' | 'Active' | 'Suspended'

export type PublicUser = {
  id: string
  fullName: string
  email: string
  username: string
  roles: Role[]
  state: AccountState
  // ISO date string, e.g. "2026-10-16T07:57:13.573Z"
  createdAt: string
}