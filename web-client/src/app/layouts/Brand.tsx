type BrandProps = {
  // Which side of Relay this is, e.g. "Student" or "Admin console".
  label: string
}

// The Relay wordmark with the console name, at the top of the sidebar and the mobile menu.
export function Brand({ label }: BrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="size-8 shrink-0 rounded-tile bg-accent-gradient" />
      <div className="min-w-0">
        <p className="font-semibold">Relay</p>
        <p className="ds-label">{label}</p>
      </div>
    </div>
  )
}
