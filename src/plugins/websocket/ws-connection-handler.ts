import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { RawData, WebSocket } from "ws";
import { AppError } from "../../shared/errors/app-error";
import { InboundWsEventSchema, type OutboundWsEvent } from "./contracts";
import { routeWsEvent } from "./event-router";
import type { ConnectionIndex } from "./connection-index";
import type { RealtimeTransport } from "./realtime.types";

type WsConnectionHandlerDeps = {
  connectionIndex: ConnectionIndex;
  realtimeTransport: RealtimeTransport;
  logger: Pick<FastifyBaseLogger, "error">;
  heartbeatIntervalMs: number;
};

export function sendSocketPayload(socket: WebSocket, payload: object): void {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch {
    // Ошибки send не должны ломать lifecycle соединения.
  }
}

export function rejectUnauthorizedSocket(
  socket: WebSocket,
  message = "Invalid or missing auth token.",
): void {
  sendSocketPayload(socket, {
    type: "server.error",
    code: "UNAUTHORIZED",
    message,
  });
  socket.close(1008, "Unauthorized");
}

function toWebSocketError(error: unknown): { code: string; message: string } {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Failed to process event.",
  };
}

function decodeRawData(raw: RawData): string {
  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf8");
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString("utf8");
  }

  return raw.toString("utf8");
}

export function createAuthorizedConnectionHandler(deps: WsConnectionHandlerDeps) {
  return async (socket: WebSocket, userId: string): Promise<void> => {
    const presenceAdapter = deps.realtimeTransport.getPresenceAdapter();
    const chatsAdapter = deps.realtimeTransport.getChatsAdapter();
    if (!presenceAdapter || !chatsAdapter) {
      deps.logger.error("Realtime adapters are not configured.");
      socket.close(1011, "Realtime is unavailable");
      return;
    }

    const connectionId = randomUUID();
    let isClosed = false;
    let isInitialized = false;
    let messageQueue = Promise.resolve();
    let heartbeatTimer: NodeJS.Timeout | null = null;

    const touchPresence = async (): Promise<void> => {
      if (!isInitialized) {
        return;
      }

      try {
        await presenceAdapter.touchConnection({
          userId,
          connectionId,
        });
      } catch (error) {
        deps.logger.error(
          { err: error, userId, connectionId },
          "Failed to refresh realtime presence connection.",
        );
      }
    };

    const initializeConnection = async (): Promise<void> => {
      let initialPresence;
      try {
        initialPresence = await presenceAdapter.registerRealtimeConnection({
          userId,
          connectionId,
        });
      } catch (error) {
        deps.logger.error({ err: error }, "Failed to initialize presence state.");
        rejectUnauthorizedSocket(socket, "Invalid auth context.");
        throw error;
      }

      if (isClosed) {
        try {
          const presence = await presenceAdapter.unregisterRealtimeConnection({
            userId,
            connectionId,
          });

          await deps.realtimeTransport.publishPresenceUpdated(presence);
        } catch (error) {
          deps.logger.error(
            { err: error },
            "Failed to cleanup presence after early websocket close.",
          );
        }
        return;
      }

      deps.connectionIndex.addConnection(connectionId, userId, socket);
      isInitialized = true;

      heartbeatTimer = setInterval(() => {
        if (isClosed || !deps.connectionIndex.hasConnection(connectionId)) {
          return;
        }

        try {
          socket.ping();
        } catch {
          // Ошибки ping обрабатываются через lifecycle события socket.
        }
      }, deps.heartbeatIntervalMs);
      heartbeatTimer.unref?.();

      try {
        if (initialPresence) {
          await deps.realtimeTransport.publishPresenceUpdated(initialPresence);
        }
      } catch (error) {
        deps.logger.error({ err: error }, "Failed to publish initial presence state.");
      }
    };

    const readyPromise = initializeConnection();
    void readyPromise.catch(() => undefined);

    socket.on("pong", () => {
      void touchPresence();
    });

    const processMessage = async (message: RawData): Promise<void> => {
      await readyPromise;

      if (isClosed || !deps.connectionIndex.hasConnection(connectionId)) {
        return;
      }

      const rawPayload = decodeRawData(message);

      let decoded: unknown;
      try {
        decoded = JSON.parse(rawPayload);
      } catch {
        sendSocketPayload(socket, {
          type: "server.error",
          code: "INVALID_JSON",
          message: "Message must be valid JSON.",
        });
        return;
      }

      const parsedEvent = InboundWsEventSchema.safeParse(decoded);
      if (!parsedEvent.success) {
        sendSocketPayload(socket, {
          type: "server.error",
          code: "INVALID_EVENT",
          message: "Event payload is invalid.",
        });
        return;
      }

      await touchPresence();

      const responses = await routeWsEvent(
        parsedEvent.data,
        {
          now: new Date(),
          connectionId,
          authenticatedUserId: userId,
        },
        {
          chatsAdapter,
          presenceAdapter,
          connectionIndex: deps.connectionIndex,
        },
      );

      if (isClosed || !deps.connectionIndex.hasConnection(connectionId)) {
        return;
      }

      for (const response of responses) {
        sendSocketPayload(socket, response);
      }
    };

    socket.on("message", (message: RawData) => {
      messageQueue = messageQueue
        .then(() => processMessage(message))
        .catch((error: unknown) => {
          deps.logger.error({ err: error }, "Failed to process websocket message.");
          if (isClosed || !deps.connectionIndex.hasConnection(connectionId)) {
            return;
          }

          const wsError = toWebSocketError(error);
          const response: OutboundWsEvent = {
            type: "server.error",
            code: wsError.code,
            message: wsError.message,
          };
          sendSocketPayload(socket, response);
        });
    });

    socket.once("close", () => {
      isClosed = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      const shouldUnregister = isInitialized;
      isInitialized = false;
      deps.connectionIndex.removeConnection(connectionId);

      if (!shouldUnregister) {
        return;
      }

      void (async () => {
        try {
          const presence = await presenceAdapter.unregisterRealtimeConnection({
            userId,
            connectionId,
          });

          await deps.realtimeTransport.publishPresenceUpdated(presence);
        } catch (error) {
          deps.logger.error(
            { err: error },
            "Failed to update presence on disconnect.",
          );
        }
      })();
    });
  };
}
