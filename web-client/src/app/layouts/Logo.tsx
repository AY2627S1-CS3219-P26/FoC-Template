// The Relay logo: a route from a start point to a destination, an errand across campus, on the
// coral tile. public/favicon.svg draws the same shape with fixed colours for the browser tab.
export function Logo() {
  return (
    <span aria-hidden="true" className="size-8 shrink-0 rounded-tile bg-accent-gradient text-on-accent">
      <svg viewBox="0 0 32 32" className="size-full">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22.5h.4a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 1 3.5-3.5" strokeWidth="2.8" />
          <circle cx="8.4" cy="22.5" r="2.4" strokeWidth="2.4" />
        </g>
        <circle cx="22.8" cy="9.5" r="3.3" fill="currentColor" />
      </svg>
    </span>
  )
}
