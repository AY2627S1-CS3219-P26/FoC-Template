import type { FeatureRoutes } from '@/lib/routing'
import { AdminSuppliersPage } from './pages/AdminSuppliersPage'
import { SupplierDetailPage } from './pages/SupplierDetailPage'
import { SuppliersPage } from './pages/SuppliersPage'

export const supplierRoutes: FeatureRoutes = {
  app: [
    { path: 'suppliers', Component: SuppliersPage },
    { path: 'suppliers/:id', Component: SupplierDetailPage },
  ],
  admin: [{ path: 'suppliers', Component: AdminSuppliersPage }],
}
