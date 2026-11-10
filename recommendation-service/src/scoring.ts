export const SCORER_VERSION = "v1";

const A = 0.5;
const B = 0.5;
const C = 0.3;

export type Weights = { a: number; b: number; c: number };

export const DEFAULT_WEIGHTS: Weights = { a: A, b: B, c: C };

const URGENCY_HORIZON_HOURS = 24;

const COLD_START_THRESHOLD = 5;
const COLD_START_CREDITS = 10;
const CREDIT_MIN = 1;
const CREDIT_MAX = 50;

export type ScoreInput = {
    items: string[];
    neededBy: string;
    distance: number;
};

export type SupplierStats = {
    completedCount: number;
    avgReward: number;
    avgItems: number;
    avgDist: number;
    lastEventId: string;
    updatedAt: string;
};

export type ScoreResult = {
    recommendedCredits: number;
    basis: "formula" | "default";
    contributions: {
        marketRate: number;
        itemFactor: number;
        urgencyFactor: number;
        distanceFactor: number;
        multiplier: number;
    };
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function urgency(neededBy: string): number {
    const hoursUntil = (new Date(neededBy).getTime() - Date.now()) / 3_600_000;
    if (!Number.isFinite(hoursUntil)) return 0;
    return clamp((URGENCY_HORIZON_HOURS - hoursUntil) / URGENCY_HORIZON_HOURS, 0, 1);
}

export function recommendScore(input: ScoreInput, stats: SupplierStats, weights: Weights = DEFAULT_WEIGHTS): ScoreResult {
    if (stats.completedCount < COLD_START_THRESHOLD) {
        return {
            recommendedCredits: COLD_START_CREDITS,
            basis: "default",
            contributions: { marketRate: stats.avgReward, itemFactor: 0, urgencyFactor: 0, distanceFactor: 0, multiplier: 1 },
        };
    }

    const mkt = stats.avgReward;
    const items = input.items.length;

    const itemFactor = weights.a * (stats.avgItems > 0 ? items / stats.avgItems - 1 : 0);
    const urgencyFactor = weights.b * urgency(input.neededBy);
    const distanceFactor = weights.c * (stats.avgDist > 0 ? input.distance / stats.avgDist - 1 : 0);
    const multiplier = 1 + itemFactor + urgencyFactor + distanceFactor;

    const recommendedCredits = clamp(Math.round(mkt * multiplier), CREDIT_MIN, CREDIT_MAX);

    return {
        recommendedCredits,
        basis: "formula",
        contributions: { marketRate: mkt, itemFactor, urgencyFactor, distanceFactor, multiplier },
    };
}
