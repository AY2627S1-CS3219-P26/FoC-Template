import { connect, type ConsumeMessage } from "amqplib";
import { logger } from "./lib/logger.ts";
import type { CompletedErrand, FeatureStore } from "./feature-store.ts";

const BROKER_URL = process.env.BROKER_URL ?? "amqp://relay:change-me@localhost:5672";
const EXCHANGE = "relay.events";
const DEAD_EXCHANGE = "relay.dead";
const QUEUE = "recommendation-service.orders";
const EVENT_TYPE = "order.errand.completed";
const RETRY_MS = 5000;

export async function startErrandConsumer(store: FeatureStore): Promise<void> {
    try {
        const connection = await connect(BROKER_URL);
        connection.on("error", () => {});
        connection.on("close", () => setTimeout(() => void startErrandConsumer(store), RETRY_MS));

        const channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE, "topic", { durable: true });
        await channel.assertExchange(DEAD_EXCHANGE, "topic", { durable: true });
        await channel.assertQueue(QUEUE, { durable: true, deadLetterExchange: DEAD_EXCHANGE, deadLetterRoutingKey: QUEUE });
        await channel.assertQueue(`${QUEUE}.dead`, { durable: true });
        await channel.bindQueue(`${QUEUE}.dead`, DEAD_EXCHANGE, QUEUE);
        await channel.bindQueue(QUEUE, EXCHANGE, EVENT_TYPE);
        await channel.prefetch(10);

        await channel.consume(QUEUE, async (message: ConsumeMessage | null) => {
            if (!message) return;
            let errand: CompletedErrand;
            try {
                const event = JSON.parse(message.content.toString());
                errand = {
                    supplierId: event.data.supplierId,
                    eventId: event.eventId,
                    reward: event.data.creditReward,
                    itemCount: event.data.itemCount,
                    distance: event.data.distance,
                };
                if (
                    typeof errand.eventId !== "string" ||
                    typeof errand.supplierId !== "string" ||
                    typeof errand.reward !== "number" ||
                    typeof errand.itemCount !== "number" ||
                    typeof errand.distance !== "number"
                ) {
                    throw new Error("malformed errand event");
                }
            } catch {
                channel.nack(message, false, false);
                return;
            }
            try {
                await store.apply(errand);
                logger.info({ eventId: errand.eventId, supplierId: errand.supplierId }, "applied completed errand");
                channel.ack(message);
            } catch (err) {
                logger.error({ eventId: errand.eventId, err }, "errand apply failed, will retry");
                setTimeout(() => channel.nack(message, false, true), RETRY_MS);
            }
        });
        logger.info({ queue: QUEUE, eventType: EVENT_TYPE }, "consuming completed errands");
    } catch (err) {
        logger.error({ err }, "broker connect failed, will retry");
        setTimeout(() => void startErrandConsumer(store), RETRY_MS);
    }
}
