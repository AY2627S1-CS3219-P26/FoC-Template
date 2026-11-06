import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DEFAULT_WEIGHTS, type Weights } from "../scoring.ts";

const REGION = process.env.AWS_REGION ?? "ap-southeast-1";
const BUCKET = process.env.S3_BUCKET;
const WEIGHTS_TABLE = process.env.SCORER_WEIGHTS_TABLE ?? "scorer_weights";
const PREFIX = "recommendations/";

export type LogEntry = {
    requestId: string;
    inputs: unknown;
    recommended: number;
    basis: string;
    version: string;
    latencyMs: number;
    ts: string;
};

export function refitWeights(entries: LogEntry[]): Weights {
    if (entries.length === 0) return DEFAULT_WEIGHTS;
    return DEFAULT_WEIGHTS;
}

export async function main(): Promise<void> {
    if (!BUCKET) throw new Error("S3_BUCKET is required");

    const s3 = new S3Client({ region: REGION });
    const entries: LogEntry[] = [];

    let token: string | undefined;
    do {
        const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }));
        for (const obj of page.Contents ?? []) {
            const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key! }));
            const text = await got.Body!.transformToString();
            for (const line of text.split("\n")) {
                if (line.trim()) entries.push(JSON.parse(line) as LogEntry);
            }
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    const weights = refitWeights(entries);

    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
    await doc.send(new PutCommand({
        TableName: WEIGHTS_TABLE,
        Item: { id: "current", ...weights, refitAt: new Date().toISOString(), sampleSize: entries.length },
    }));

    console.log(`refit from ${entries.length} entries ->`, weights);
}

if (process.argv[1] && process.argv[1].includes("refit-weights")) void main();
