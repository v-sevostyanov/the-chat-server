import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";
import type { RedisClient, RedisSubscriber } from "../redis/redis.plugin";
import type {
  PublishChatCreatedInput,
  PublishMessageCreatedInput,
  RealtimeTransport,
} from "./realtime.types";
import { ChatDetailDtoSchema, MessageDtoSchema, PresenceDtoSchema } from "./contracts";
import type { RealtimeDelivery } from "./realtime-delivery";

const RealtimeBusEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("presence.updated"),
    payload: PresenceDtoSchema,
  }),
  z.object({
    type: z.literal("message.created"),
    payload: z.object({
      chatId: z.string().uuid(),
      recipientUserIds: z.array(z.string().uuid()),
      message: MessageDtoSchema,
    }),
  }),
  z.object({
    type: z.literal("chat.created"),
    payload: z.object({
      recipientUserIds: z.array(z.string().uuid()),
      chat: ChatDetailDtoSchema,
    }),
  }),
]);

type RealtimeBusEvent = z.infer<typeof RealtimeBusEventSchema>;

type RealtimeBusDeps = {
  channel: string;
  redis: RedisClient;
  delivery: RealtimeDelivery;
  logger: Pick<FastifyBaseLogger, "warn">;
};

type RealtimePublishMethods = Pick<
  RealtimeTransport,
  "publishMessageCreated" | "publishChatCreated" | "publishPresenceUpdated"
>;

export type RealtimeBus = RealtimePublishMethods & {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

function stringifyEvent(event: RealtimeBusEvent): string {
  return JSON.stringify(event);
}

export function createRealtimeBus(deps: RealtimeBusDeps): RealtimeBus {
  let subscriber: RedisSubscriber | null = null;

  const publishPresenceUpdated: RealtimeTransport["publishPresenceUpdated"] = async (
    input,
  ) => {
    await deps.redis.publish(
      deps.channel,
      stringifyEvent({
        type: "presence.updated",
        payload: input,
      }),
    );
  };

  const publishMessageCreated: RealtimeTransport["publishMessageCreated"] = async (
    input: PublishMessageCreatedInput,
  ) => {
    await deps.redis.publish(
      deps.channel,
      stringifyEvent({
        type: "message.created",
        payload: input,
      }),
    );
  };

  const publishChatCreated: RealtimeTransport["publishChatCreated"] = async (
    input: PublishChatCreatedInput,
  ) => {
    await deps.redis.publish(
      deps.channel,
      stringifyEvent({
        type: "chat.created",
        payload: input,
      }),
    );
  };

  const handleBusMessage = (channel: string, rawMessage: string): void => {
    if (channel !== deps.channel) {
      return;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawMessage);
    } catch {
      deps.logger.warn(
        { channel },
        "Ignoring malformed realtime bus payload (invalid JSON).",
      );
      return;
    }

    const parsed = RealtimeBusEventSchema.safeParse(decoded);
    if (!parsed.success) {
      deps.logger.warn(
        { channel, issues: parsed.error.issues },
        "Ignoring malformed realtime bus payload (invalid shape).",
      );
      return;
    }

    if (parsed.data.type === "presence.updated") {
      deps.delivery.broadcastPresenceUpdated(parsed.data.payload);
      return;
    }

    if (parsed.data.type === "chat.created") {
      deps.delivery.broadcastChatCreated(parsed.data.payload);
      return;
    }

    deps.delivery.broadcastMessageCreated(parsed.data.payload);
  };

  const start = async (): Promise<void> => {
    if (subscriber) {
      return;
    }

    subscriber = deps.redis.duplicate();
    subscriber.on("message", handleBusMessage);
    await subscriber.connect();
    await subscriber.subscribe(deps.channel);
  };

  const stop = async (): Promise<void> => {
    if (!subscriber) {
      return;
    }

    await subscriber.quit();
    subscriber = null;
  };

  return {
    publishMessageCreated,
    publishChatCreated,
    publishPresenceUpdated,
    start,
    stop,
  };
}
