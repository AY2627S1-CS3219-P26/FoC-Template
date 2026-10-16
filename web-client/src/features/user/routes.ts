import type { FeatureRoutes } from '@/lib/routing'
import { AdminReportsPage } from './pages/AdminReportsPage'
import { AdminStudentsPage } from './pages/AdminStudentsPage'
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
  app: [{ path: 'profile', Component: ProfilePage }],
  admin: [
    { path: 'students', Component: AdminStudentsPage },
    { path: 'reports', Component: AdminReportsPage },
  ],
}