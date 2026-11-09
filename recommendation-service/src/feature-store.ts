import type { SupplierStats } from "./scoring.ts";

export type CompletedErrand = {
    supplierId: string;
    eventId: string;
    reward: number;
    itemCount: number;
    distance: number;
    leadTimeMin: number;
};

const ALPHA = 0.2;

const blend = (prev: number, observed: number) => ALPHA * observed + (1 - ALPHA) * prev;

export function ewmaUpdate(prev: SupplierStats | null, errand: CompletedErrand): SupplierStats {
    if (!prev || prev.completedCount === 0) {
        return {
            completedCount: 1,
            avgReward: errand.reward,
            avgItems: errand.itemCount,
            avgDist: errand.distance,
            avgLeadTimeMin: errand.leadTimeMin,
            lastEventId: errand.eventId,
            updatedAt: new Date().toISOString(),
        };
    }

    return {
        completedCount: prev.completedCount + 1,
        avgReward: blend(prev.avgReward, errand.reward),
        avgItems: blend(prev.avgItems, errand.itemCount),
        avgDist: blend(prev.avgDist, errand.distance),
        avgLeadTimeMin: blend(prev.avgLeadTimeMin, errand.leadTimeMin),
        lastEventId: errand.eventId,
        updatedAt: new Date().toISOString(),
    };
}

export interface FeatureStore {
    get(supplierId: string): Promise<SupplierStats | null>;
    apply(errand: CompletedErrand): Promise<void>;
}

export class InMemoryFeatureStore implements FeatureStore {
    private readonly stats = new Map<string, SupplierStats>();

    async get(supplierId: string): Promise<SupplierStats | null> {
        return this.stats.get(supplierId) ?? null;
    }

    async apply(errand: CompletedErrand): Promise<void> {
        const prev = this.stats.get(errand.supplierId) ?? null;
        if (prev && prev.lastEventId === errand.eventId) return;
        this.stats.set(errand.supplierId, ewmaUpdate(prev, errand));
    }
}
