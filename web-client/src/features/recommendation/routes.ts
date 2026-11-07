import type { FeatureRoutes } from '@/lib/routing'
import { RecommendationPage } from './pages/RecommendationPage'

export const recommendationRoutes: FeatureRoutes = {
  app: [{ path: 'recommendation', Component: RecommendationPage }],
}
