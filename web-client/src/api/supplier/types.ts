// Mirrors the supplier JSON in supplier-service/README.md, section "API", and the fields
// accepted by supplier-service/src/domain/validation.ts. Change both together.

export type SupplierStatus = 'Active' | 'Inactive'

// The order the supplier-service lists them in. Monday is the first day of its week.
export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export type Weekday = (typeof weekdays)[number]

// Times are "HH:MM". closes may be "24:00", and a closing time before the opening time runs past midnight.
export type SupplierHours = {
  day: Weekday
  opens: string
  closes: string
}

export type SupplierAvailability = {
  open: boolean
  closesAt: string | null
  nextOpensAt: { day: Weekday; time: string } | null
}

export type Supplier = {
  id: string
  name: string
  type: string
  zone: string
  building: string
  address: string
  description: string | null
  latitude: number | null
  longitude: number | null
  contact: { phone: string | null; email: string | null }
  // Only the days it opens. A weekday that is not listed is closed all day.
  hours: SupplierHours[]
  status: SupplierStatus
  availability: SupplierAvailability
  createdAt: string
  updatedAt: string
}

// The supplier-service matches type, zone and building ignoring case.
export type SupplierFilters = {
  q?: string
  type?: string
  zone?: string
  building?: string
  // The supplier-service lists only Active suppliers unless told otherwise.
  status?: SupplierStatus | 'all'
  page: number
  // 1 to 20. The supplier-service uses 20 when none is given.
  pageSize?: number
}

// GET /suppliers/filters: every type, zone and building in use by suppliers of that status.
export type SupplierFilterValues = {
  types: string[]
  zones: string[]
  buildings: string[]
}

// GET /suppliers/:id/availability. orderable is true only when the supplier is Active and open at `at`,
// which is what a new errand needs (F3.1.3).
export type SupplierAvailabilityCheck = SupplierAvailability & {
  supplierId: string
  at: string
  timezone: string
  status: SupplierStatus
  orderable: boolean
}

// The body of a create or update. Numbers and times are sent as the user typed them when they
// do not read as one, so the supplier-service names the field it refuses (N5.4).
export type SupplierInput = {
  name: string
  type: string
  zone: string
  building: string
  address: string
  description: string
  latitude: number | string | null
  longitude: number | string | null
  contact: { phone: string; email: string }
  hours: SupplierHours[]
}
