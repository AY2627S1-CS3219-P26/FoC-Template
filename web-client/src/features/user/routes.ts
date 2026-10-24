import type { FeatureRoutes } from '@/lib/routing'
import { AdminReportsPage } from './pages/AdminReportsPage'
import { AdminStudentDetailPage } from './pages/AdminStudentDetailPage'
import { AdminStudentsPage } from './pages/AdminStudentsPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignupPage } from './pages/SignupPage'
import { VerifyPage } from './pages/VerifyPage'

export const userRoutes: FeatureRoutes = {
  guest: [
    { path: 'login', Component: LoginPage },
    { path: 'signup', Component: SignupPage },
    { path: 'verify', Component: VerifyPage },
  ],
  app: [
    { path: 'profile', Component: ProfilePage },
    { path: 'profile/edit', Component: EditProfilePage },
    { path: 'profile/password', Component: ChangePasswordPage },
  ],
  admin: [
    { path: 'students', Component: AdminStudentsPage },
    { path: 'students/:id', Component: AdminStudentDetailPage },
    { path: 'reports', Component: AdminReportsPage },
  ],
}
