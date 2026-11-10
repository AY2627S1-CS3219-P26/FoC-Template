import { pathToFileURL } from "node:url";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DEFAULT_WEIGHTS, type Weights } from "../scoring.ts";
import { TRAINING_PREFIX, type TrainingSample } from "../feature-store.ts";
import { config } from "../config.ts";
import { isValidWeights } from "../weights.ts";

const MIN_SAMPLES = 20;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 2;

export function validSamples(records: unknown[]): TrainingSample[] {
    const seen = new Set<string>();
    return records.filter((record): record is TrainingSample => {
        if (!record || typeof record !== "object") return false;
        const s = record as TrainingSample;
        if (![s.itemFactorInput, s.distFactorInput, s.rewardOverMarket].every(v => typeof v === "number" && Number.isFinite(v))) return false;
        if (s.eventId !== undefined) {
            if (typeof s.eventId !== "string" || !s.eventId || seen.has(s.eventId)) return false;
            seen.add(s.eventId);
        }
        return true;
    });
}

export function refitWeights(records: unknown[], current: Weights = DEFAULT_WEIGHTS): Weights {
    const samples = validSamples(records);
    if (samples.length < MIN_SAMPLES) return current;

    let sii = 0, sdd = 0, sid = 0, siy = 0, sdy = 0;
    for (const s of samples) {
        const { itemFactorInput: xi, distFactorInput: xd, rewardOverMarket: y } = s;
        sii += xi * xi; sdd += xd * xd; sid += xi * xd; siy += xi * y; sdy += xd * y;
    }

    if (![sii, sdd, sid, siy, sdy].every(Number.isFinite)) return current;
    let a = current.a, c = current.c;
    if (sii > 1e-12 && sdd > 1e-12) {
        const scale = sii * sdd;
        const det = scale - sid * sid;
        if (!Number.isFinite(scale) || det <= 1e-9 * scale) return current;
        a = (siy * sdd - sdy * sid) / det;
        c = (sdy * sii - siy * sid) / det;
    } else if (sii > 1e-12) {
        a = (siy - current.c * sid) / sii;
    } else if (sdd > 1e-12) {
        c = (sdy - current.a * sid) / sdd;
    } else return current;

    if (![a, c].every(Number.isFinite)) return current;
    const clamp = (n: number) => Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, n));
    return { a: clamp(a), b: current.b, c: clamp(c) };
}

export async function main(): Promise<void> {
    if (!config.S3_BUCKET) throw new Error("S3_BUCKET is required");

    const s3 = new S3Client({ region: config.AWS_REGION, endpoint: config.S3_ENDPOINT });
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.AWS_REGION, endpoint: config.DYNAMODB_ENDPOINT }));
    try {
        const { Item } = await doc.send(new GetCommand({ TableName: config.SCORER_WEIGHTS_TABLE, Key: { id: "current" }, ConsistentRead: true }));
        if (Item && !isValidWeights(Item)) throw new Error("Stored scorer weights are invalid; refusing to overwrite them");
        const current: Weights = Item ? { a: Item.a, b: Item.b, c: Item.c } : { ...DEFAULT_WEIGHTS };
        const records: unknown[] = [];
        let malformedLines = 0;
        let token: string | undefined;
        do {
            const page = await s3.send(new ListObjectsV2Command({ Bucket: config.S3_BUCKET, Prefix: `${TRAINING_PREFIX}/`, ContinuationToken: token }));
            for (const obj of page.Contents ?? []) {
                if (!obj.Key?.endsWith(".ndjson")) continue;
                const got = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: obj.Key }));
                if (!got.Body) throw new Error(`Missing training object body: ${obj.Key}`);
                const text = await got.Body.transformToString();
                for (const line of text.split("\n")) {
                    if (!line.trim()) continue;
                    try { records.push(JSON.parse(line)); } catch { malformedLines++; }
                }
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
            if (page.IsTruncated && !token) throw new Error("Missing training listing continuation token");
        } while (token);

        const samples = validSamples(records);
        const weights = refitWeights(samples, current);
        if (weights === current) {
            console.log(`kept current weights: insufficient or degenerate data (${samples.length} valid samples, ${malformedLines} malformed lines)`);
            return;
        }
        await doc.send(new PutCommand({
            TableName: config.SCORER_WEIGHTS_TABLE,
            Item: { id: "current", ...weights, refitAt: new Date().toISOString(), sampleSize: samples.length },
            // Do not replace a newer trainer's result with a fit based on stale weights.
            ConditionExpression: Item ? "#a = :a AND #b = :b AND #c = :c" : "attribute_not_exists(id)",
            ...(Item ? { ExpressionAttributeNames: { "#a": "a", "#b": "b", "#c": "c" }, ExpressionAttributeValues: { ":a": current.a, ":b": current.b, ":c": current.c } } : {}),
        }));
        console.log(`refit from ${samples.length} valid samples (${malformedLines} malformed lines) ->`, weights);
    } finally {
        s3.destroy();
        doc.destroy();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(err => { console.error(err); process.exitCode = 1; });
}
