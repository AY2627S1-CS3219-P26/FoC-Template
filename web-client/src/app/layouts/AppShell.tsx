import { appNav } from '../navigation'
import { Shell } from './Shell'
import { SideNav } from './SideNav'

export function AppShell() {
  return <Shell label="Student" nav={<SideNav label="Main" items={appNav} />} />
}