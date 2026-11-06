import { Router } from "express";
import { authorize } from "../auth.ts";
import { validateRecommendationRequest } from "../validator.ts";
import { recommendScore, SCORER_VERSION, type SupplierStats } from "../scoring.ts";
import type { FeatureStore } from "../feature-store.ts";

const COLD_START_STATS: SupplierStats = {
    completedCount: 0,
    avgReward: 0,
    avgItems: 0,
    avgDist: 0,
    avgLeadTimeMin: 0,
    lastEventId: "",
    updatedAt: "",
};

export function createRecommendationsRouter(store: FeatureStore): Router {
    const router = Router();

    router.post("/recommendations", authorize(), async (req, res) => {
        const result = validateRecommendationRequest(req.body);
        if (!result.ok) {
            res.status(400).json({ errors: result.errors });
            return;
        }

        const { supplierId, items, neededBy } = result.data;
        const stats = (await store.get(supplierId)) ?? COLD_START_STATS;
        const score = recommendScore({ items, neededBy, distance: stats.avgDist }, stats);

        res.json({
            recommendedCredits: score.recommendedCredits,
            basis: score.basis,
            version: SCORER_VERSION,
            features: score.contributions,
        });
    });

    return router;
}
