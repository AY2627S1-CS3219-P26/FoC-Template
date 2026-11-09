import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ewmaUpdate, type CompletedErrand, type FeatureStore } from "./feature-store.ts";
import type { SupplierStats } from "./scoring.ts";

export type DynamoFeatureStoreOptions = {
    tableName: string;
    region: string;
    endpoint?: string;
};

export class DynamoFeatureStore implements FeatureStore {
    private readonly doc: DynamoDBDocumentClient;
    private readonly table: string;

    constructor(opts: DynamoFeatureStoreOptions) {
        this.table = opts.tableName;
        this.doc = DynamoDBDocumentClient.from(
            new DynamoDBClient({ region: opts.region, endpoint: opts.endpoint }),
        );
    }

    async get(supplierId: string): Promise<SupplierStats | null> {
        const { Item } = await this.doc.send(
            new GetCommand({ TableName: this.table, Key: { supplierId } }),
        );
        return (Item as SupplierStats | undefined) ?? null;
    }

    async apply(errand: CompletedErrand): Promise<void> {
        const prev = await this.get(errand.supplierId);
        if (prev && prev.lastEventId === errand.eventId) return;

        const next = ewmaUpdate(prev, errand);

        try {
            await this.doc.send(
                new UpdateCommand({
                    TableName: this.table,
                    Key: { supplierId: errand.supplierId },
                    UpdateExpression:
                        "SET completedCount = :cc, avgReward = :ar, avgItems = :ai, " +
                        "avgDist = :ad, avgLeadTimeMin = :al, lastEventId = :eid, updatedAt = :now",
                    ConditionExpression: "attribute_not_exists(lastEventId) OR lastEventId <> :eid",
                    ExpressionAttributeValues: {
                        ":cc": next.completedCount,
                        ":ar": next.avgReward,
                        ":ai": next.avgItems,
                        ":ad": next.avgDist,
                        ":al": next.avgLeadTimeMin,
                        ":eid": next.lastEventId,
                        ":now": next.updatedAt,
                    },
                }),
            );
        } catch (err) {
            if (err instanceof ConditionalCheckFailedException) return;
            throw err;
        }
    }
}
