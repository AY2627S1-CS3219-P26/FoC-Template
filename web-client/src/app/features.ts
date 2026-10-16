import { userRoutes } from '@/features/user/routes'
import type { FeatureRoutes } from '@/lib/routing'

// The routes of every feature. A new feature is registered here once, by the platform owner.
export const features: FeatureRoutes[] = [userRoutes]