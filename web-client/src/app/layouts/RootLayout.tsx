import { Outlet } from 'react-router'
import { OverflowWarning } from '../dev/OverflowWarning'

export function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <OverflowWarning />}
    </>
  )
}