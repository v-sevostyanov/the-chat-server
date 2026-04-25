import websocket from "@fastify/websocket";
import fp from "fastify-plugin";
import { ConnectionIndex } from "./connection-index";
import { createRealtimeBus } from "./realtime-bus";
import { RealtimeDelivery } from "./realtime-delivery";
import type {
  ChatsRealtimeAdapter,
  PresenceRealtimeAdapter,
  RealtimeTransport,
} from "./realtime.types";
import { resolveSocketUserId } from "./ws-auth";
import {
  createAuthorizedConnectionHandler,
  rejectUnauthorizedSocket,
} from "./ws-connection-handler";

export const websocketPlugin = fp(
  async (fastify) => {
    const connectionIndex = new ConnectionIndex();
    const realtimeDelivery = new RealtimeDelivery(connectionIndex, fastify.log);

    let presenceAdapter: PresenceRealtimeAdapter | null = null;
    let chatsAdapter: ChatsRealtimeAdapter | null = null;

    const realtimeBus = createRealtimeBus({
      channel: fastify.config.websocketRealtimeChannel,
      redis: fastify.redis,
      delivery: realtimeDelivery,
      logger: fastify.log,
    });

    const realtimeTransport: RealtimeTransport = {
      publishMessageCreated: realtimeBus.publishMessageCreated,
      publishChatCreated: realtimeBus.publishChatCreated,
      publishPresenceUpdated: realtimeBus.publishPresenceUpdated,
      bindPresenceAdapter: (adapter) => {
        if (presenceAdapter) {
          throw new Error("Presence realtime adapter is already bound.");
        }
        presenceAdapter = adapter;
      },
      bindChatsAdapter: (adapter) => {
        if (chatsAdapter) {
          throw new Error("Chats realtime adapter is already bound.");
        }
        chatsAdapter = adapter;
      },
      getPresenceAdapter: () => presenceAdapter,
      getChatsAdapter: () => chatsAdapter,
    };

    fastify.decorate("realtime", realtimeTransport);

    fastify.addHook("onReady", async () => {
      if (!realtimeTransport.getPresenceAdapter()) {
        throw new Error("Presence realtime adapter was not bound.");
      }

      if (!realtimeTransport.getChatsAdapter()) {
        throw new Error("Chats realtime adapter was not bound.");
      }
    });

    await realtimeBus.start();

    fastify.addHook("onClose", async () => {
      await realtimeBus.stop();
    });

    await fastify.register(websocket, {
      options: {
        maxPayload: fastify.config.websocketMaxPayloadBytes,
      },
    });

    const handleAuthorizedConnection = createAuthorizedConnectionHandler({
      connectionIndex,
      realtimeTransport,
      logger: fastify.log,
      heartbeatIntervalMs: fastify.config.websocketHeartbeatIntervalMs,
    });

    fastify.get(
      fastify.config.websocketPath,
      {
        websocket: true,
        schema: {
          hide: true,
        },
      },
      async (socket, request) => {
        const userId = await resolveSocketUserId(request);
        if (!userId) {
          rejectUnauthorizedSocket(socket);
          return;
        }

        await handleAuthorizedConnection(socket, userId);
      },
    );
  },
  {
    name: "websocket-plugin",
  },
);
