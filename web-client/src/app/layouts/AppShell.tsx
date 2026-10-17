import { appNav } from '../navigation'
import { Shell } from './Shell'
import { SideNav } from './SideNav'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <Shell
      label="Student"
      nav={<SideNav label="Main" items={appNav} />}
      mobileNav={<TabBar label="Main" items={appNav} />}
    />
  )
}