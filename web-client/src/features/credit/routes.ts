import type { FeatureRoutes } from '@/lib/routing'
import { WalletPage } from './pages/WalletPage'

export const creditRoutes: FeatureRoutes = {
  app: [{ path: 'wallet', Component: WalletPage }],
}
