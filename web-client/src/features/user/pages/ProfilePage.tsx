import { useCurrentUser } from '@/api/user/session'
import { Page } from '@/components/Page'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { EditProfileForm } from '../components/EditProfileForm'
import { LogoutButton } from '../components/LogoutButton'

export function ProfilePage() {
  const user = useCurrentUser()

  return (
    <Page title="Profile">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <EditProfileForm user={user} />
        <ChangePasswordForm />
      </div>
      {/* Below lg there is no sidebar, so this is where people log out. From lg the sidebar has it. */}
      <div className="lg:hidden">
        <LogoutButton look="button" />
      </div>
    </Page>
  )
}
