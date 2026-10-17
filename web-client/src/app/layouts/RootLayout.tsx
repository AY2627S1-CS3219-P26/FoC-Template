import { Outlet } from 'react-router'
import { OverflowWarning } from '../dev/OverflowWarning'
import { SkipLink } from './SkipLink'

export function RootLayout() {
  return (
    <>
      <SkipLink />
      <Outlet />
      {import.meta.env.DEV && <OverflowWarning />}
    </>
  )
}