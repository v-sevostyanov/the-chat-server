import type { WebSocket } from "ws";
import type { FastifyBaseLogger } from "fastify";
import type { ChatDetailDto } from "../../modules/chats/chats.types";
import type { MessageDto } from "../../modules/messages/messages.types";
import type { PresenceDto } from "../../modules/presence/presence.types";
import type { OutboundWsEvent } from "./contracts";
import type { ConnectionIndex } from "./connection-index";

type BroadcastMessageCreatedInput = {
  chatId: string;
  recipientUserIds: string[];
  message: MessageDto;
};

type BroadcastChatCreatedInput = {
  recipientUserIds: string[];
  chat: ChatDetailDto;
};

const MAX_BUFFERED_BYTES = 5 * 1024 * 1024;

function send(
  socket: WebSocket,
  payload: object,
  logger: Pick<FastifyBaseLogger, "warn">,
): void {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
    logger.warn(
      { bufferedAmount: socket.bufferedAmount },
      "Skipping websocket send due to backpressure.",
    );
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    logger.warn({ err: error }, "Failed to send websocket payload.");
  }
}

export class RealtimeDelivery {
  readonly #connectionIndex: ConnectionIndex;
  readonly #logger: Pick<FastifyBaseLogger, "warn">;

  constructor(
    connectionIndex: ConnectionIndex,
    logger: Pick<FastifyBaseLogger, "warn">,
  ) {
    this.#connectionIndex = connectionIndex;
    this.#logger = logger;
  }

  sendToConnection(connectionId: string, event: OutboundWsEvent): void {
    const connection = this.#connectionIndex.getConnection(connectionId);
    if (!connection) {
      return;
    }

    send(connection.socket, event, this.#logger);
  }

  broadcastPresenceUpdated(presence: PresenceDto): void {
    const watcherConnectionIds = this.#connectionIndex.listPresenceWatcherConnectionIds(
      presence.userId,
    );
    if (watcherConnectionIds.length === 0) {
      return;
    }

    for (const connectionId of watcherConnectionIds) {
      this.sendToConnection(connectionId, {
        type: "presence.updated",
        userId: presence.userId,
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt,
      });
    }
  }

  broadcastMessageCreated(input: BroadcastMessageCreatedInput): void {
    const subscribedConnectionIds = this.#connectionIndex.listChatConnectionIds(input.chatId);
    if (subscribedConnectionIds.length === 0) {
      return;
    }

    const recipientUsers = new Set(input.recipientUserIds);

    for (const connectionId of subscribedConnectionIds) {
      const connection = this.#connectionIndex.getConnection(connectionId);
      if (!connection) {
        continue;
      }

      if (!recipientUsers.has(connection.userId)) {
        continue;
      }

      send(
        connection.socket,
        {
          type: "message.created",
          chatId: input.chatId,
          message: input.message,
        },
        this.#logger,
      );
    }
  }

  broadcastChatCreated(input: BroadcastChatCreatedInput): void {
    const recipientUsers = new Set(input.recipientUserIds);

    for (const userId of recipientUsers) {
      const userConnectionIds = this.#connectionIndex.listUserConnectionIds(userId);
      if (userConnectionIds.length === 0) {
        continue;
      }

      for (const connectionId of userConnectionIds) {
        this.sendToConnection(connectionId, {
          type: "chat.created",
          chat: input.chat,
        });
      }
    }
  }
}
