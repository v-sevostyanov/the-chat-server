import type { InboundWsEvent, OutboundWsEvent } from "./contracts";
import type { ConnectionIndex } from "./connection-index";
import type {
  ChatsRealtimeAdapter,
  PresenceRealtimeAdapter,
} from "./realtime.types";

type WsEventContext = {
  readonly now: Date;
  readonly connectionId: string;
  readonly authenticatedUserId: string;
};

type WsEventRouterDeps = {
  readonly chatsAdapter: ChatsRealtimeAdapter;
  readonly presenceAdapter: PresenceRealtimeAdapter;
  readonly connectionIndex: ConnectionIndex;
};

type EventHandler<T extends InboundWsEvent["type"]> = (
  event: Extract<InboundWsEvent, { type: T }>,
  context: WsEventContext,
  deps: WsEventRouterDeps,
) => Promise<OutboundWsEvent[]>;

const pingHandler: EventHandler<"client.ping"> = async (event, context) => [
  {
    type: "server.pong",
    correlationId: event.correlationId,
    serverTime: context.now.toISOString(),
  },
];

const presenceSubscribeHandler: EventHandler<"presence.subscribe"> = async (
  _event,
  context,
  deps,
) => {
  const currentUserPresence = await deps.presenceAdapter.subscribeCurrentUserPresence(
    context.authenticatedUserId,
  );

  deps.connectionIndex.setPresenceWatchList(context.connectionId, [
    context.authenticatedUserId,
  ]);

  return [
    {
      type: "presence.subscribed",
      userId: currentUserPresence.userId,
      isOnline: currentUserPresence.isOnline,
      lastSeenAt: currentUserPresence.lastSeenAt,
    },
  ];
};

const presenceWatchHandler: EventHandler<"presence.watch"> = async (
  event,
  context,
  deps,
) => {
  const watch = await deps.presenceAdapter.watchUsersPresence(
    context.authenticatedUserId,
    event.userIds,
  );

  deps.connectionIndex.setPresenceWatchList(
    context.connectionId,
    watch.watchedUserIds,
  );

  const events: OutboundWsEvent[] = [
    {
      type: "presence.watched",
      userIds: watch.watchedUserIds,
    },
  ];

  for (const snapshot of watch.snapshots) {
    events.push({
      type: "presence.updated",
      userId: snapshot.userId,
      isOnline: snapshot.isOnline,
      lastSeenAt: snapshot.lastSeenAt,
    });
  }

  return events;
};

const chatSubscribeHandler: EventHandler<"chat.subscribe"> = async (
  event,
  context,
  deps,
) => {
  const isMember = await deps.chatsAdapter.isUserChatMember(
    event.chatId,
    context.authenticatedUserId,
  );
  if (!isMember) {
    return [
      {
        type: "server.error",
        code: "FORBIDDEN",
        message: "Chat subscription is not allowed.",
      },
    ];
  }

  deps.connectionIndex.subscribeConnectionToChat(
    context.connectionId,
    event.chatId,
  );

  return [
    {
      type: "chat.subscribed",
      chatId: event.chatId,
    },
  ];
};

const chatUnsubscribeHandler: EventHandler<"chat.unsubscribe"> = async (
  event,
  context,
  deps,
) => {
  deps.connectionIndex.unsubscribeConnectionFromChat(
    context.connectionId,
    event.chatId,
  );

  return [
    {
      type: "chat.unsubscribed",
      chatId: event.chatId,
    },
  ];
};

const handlers: {
  [K in InboundWsEvent["type"]]: EventHandler<K>;
} = {
  "client.ping": pingHandler,
  "presence.subscribe": presenceSubscribeHandler,
  "presence.watch": presenceWatchHandler,
  "chat.subscribe": chatSubscribeHandler,
  "chat.unsubscribe": chatUnsubscribeHandler,
};

export async function routeWsEvent(
  event: InboundWsEvent,
  context: WsEventContext,
  deps: WsEventRouterDeps,
): Promise<OutboundWsEvent[]> {
  switch (event.type) {
    case "client.ping":
      return handlers["client.ping"](event, context, deps);
    case "presence.subscribe":
      return handlers["presence.subscribe"](event, context, deps);
    case "presence.watch":
      return handlers["presence.watch"](event, context, deps);
    case "chat.subscribe":
      return handlers["chat.subscribe"](event, context, deps);
    case "chat.unsubscribe":
      return handlers["chat.unsubscribe"](event, context, deps);
  }
}
