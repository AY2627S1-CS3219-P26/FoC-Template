import { PlaceholderPage } from '@/components/PlaceholderPage'
import { LogoutButton } from '../components/LogoutButton'

export function ProfilePage() {
  return (
    <PlaceholderPage title="Profile" owner="user-service" file="src/features/user/pages/ProfilePage.tsx">
      {/* On phones there is no sidebar, so this is where people log out, as in the prototype. */}
      <LogoutButton look="button" />
    </PlaceholderPage>
  )
}
