import type { FeatureRoutes } from '@/lib/routing'
import { AdminDisputesPage } from './pages/AdminDisputesPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { ErrandsPage } from './pages/ErrandsPage'
import { PostErrandPage } from './pages/PostErrandPage'

export const orderRoutes: FeatureRoutes = {
  app: [
    { path: 'errands', Component: ErrandsPage },
    { path: 'errands/new', Component: PostErrandPage },
  ],
  admin: [
    { path: 'orders', Component: AdminOrdersPage },
    { path: 'disputes', Component: AdminDisputesPage },
  ],
}
