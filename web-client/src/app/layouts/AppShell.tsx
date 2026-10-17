import { BalanceCard } from '@/features/credit/components/BalanceCard'
import { LogoutButton } from '@/features/user/components/LogoutButton'
import { appNav } from '../navigation'
import { Shell } from './Shell'
import { SideNav } from './SideNav'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <Shell
      label="Student"
      nav={<SideNav label="Main" items={appNav} />}
      mobileTabBar={<TabBar label="Main" items={appNav} />}
      sidebarFooter={
        <>
          <BalanceCard />
          <LogoutButton look="nav" />
        </>
      }
    />
  )
}
