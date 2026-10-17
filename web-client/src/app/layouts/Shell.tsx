import { Outlet } from 'react-router'
import type { ReactNode } from 'react'

type ShellProps = {
  // Shown under the wordmark, e.g. "Student" or "Admin console".
  label: string
  // The navigation in the sidebar.
  nav: ReactNode
  // The navigation below lg, where there is no sidebar.
  mobileNav: ReactNode
  // Pinned to the bottom of the sidebar, e.g. the credit balance and log out.
  sidebarFooter?: ReactNode
}

// The frame shared by the student app and the admin console: a sidebar from lg (1024px) up,
// the page next to it. Below lg the sidebar is hidden and a mobile navigation takes over.
export function Shell({ label, nav, mobileNav, sidebarFooter }: ShellProps) {
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="ds-surface ds-surface--chrome hidden rounded-none border-y-0 border-l-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:gap-8 lg:p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-9 shrink-0 rounded-tile bg-accent-gradient" />
          <div className="min-w-0">
            <p className="text-lg font-bold">Relay</p>
            <p className="ds-label">{label}</p>
          </div>
        </div>
        {nav}
        {sidebarFooter && <div className="mt-auto grid grid-cols-1 gap-3">{sidebarFooter}</div>}
      </aside>
      {/* The bottom padding keeps the last content above the floating tab bar on phones. */}
      <main id="main" className="min-w-0 flex-1 pb-28 lg:pb-0">
        <Outlet />
      </main>
      <div className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md lg:hidden">{mobileNav}</div>
    </div>
  )
}