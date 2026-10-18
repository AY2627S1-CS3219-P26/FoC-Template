import { Outlet } from 'react-router'

// The frame of the signed-out pages: a narrow centred column with the wordmark on top,
// like the login and sign-up screens of the prototype.
export function AuthLayout() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh w-full max-w-md grid-cols-1 content-center gap-6 px-4 py-12">
      <p className="text-5xl font-bold tracking-tighter">Relay</p>
      <Outlet />
    </main>
  )
}