import { z } from "zod";
import type { ChatDetailDto } from "../../modules/chats/chats.types";
import type { MessageDto } from "../../modules/messages/messages.types";
import type { PresenceDto } from "../../modules/presence/presence.types";

export const MessageDtoSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  clientMessageId: z.string().uuid().nullable(),
  sender: z.object({
    id: z.string().uuid(),
    username: z.string(),
    displayName: z.string(),
  }),
  body: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  editedAt: z.string().datetime({ offset: true }).nullable(),
});

export const PresenceDtoSchema = z.object({
  userId: z.string().uuid(),
  isOnline: z.boolean(),
  lastSeenAt: z.string().datetime({ offset: true }).nullable(),
});

export const ChatMemberDtoSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
  joinedAt: z.string().datetime({ offset: true }),
});

export const ChatDetailDtoSchema = z.object({
  id: z.string().uuid(),
  type: z.union([z.literal("direct"), z.literal("group")]),
  title: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  membersCount: z.number().int().nonnegative(),
  members: z.array(ChatMemberDtoSchema),
});

export const ClientPingEventSchema = z.object({
  type: z.literal("client.ping"),
  correlationId: z.string().uuid().optional(),
});

export const PresenceSubscribeEventSchema = z.object({
  type: z.literal("presence.subscribe"),
});

export const PresenceWatchEventSchema = z.object({
  type: z.literal("presence.watch"),
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

export const ChatSubscribeEventSchema = z.object({
  type: z.literal("chat.subscribe"),
  chatId: z.string().uuid(),
});

export const ChatUnsubscribeEventSchema = z.object({
  type: z.literal("chat.unsubscribe"),
  chatId: z.string().uuid(),
});

export const InboundWsEventSchema = z.discriminatedUnion("type", [
  ClientPingEventSchema,
  PresenceSubscribeEventSchema,
  PresenceWatchEventSchema,
  ChatSubscribeEventSchema,
  ChatUnsubscribeEventSchema,
]);

export type InboundWsEvent = z.infer<typeof InboundWsEventSchema>;

export type WsEventError = {
  type: "server.error";
  code: string;
  message: string;
};

export type ServerPongEvent = {
  type: "server.pong";
  correlationId?: string;
  serverTime: string;
};

export type PresenceSubscribedEvent = {
  type: "presence.subscribed";
} & PresenceDto;

export type PresenceWatchedEvent = {
  type: "presence.watched";
  userIds: string[];
};

export type PresenceUpdatedEvent = {
  type: "presence.updated";
} & PresenceDto;

export type ChatSubscribedEvent = {
  type: "chat.subscribed";
  chatId: string;
};

export type ChatUnsubscribedEvent = {
  type: "chat.unsubscribed";
  chatId: string;
};

export type MessageCreatedEvent = {
  type: "message.created";
  chatId: string;
  message: MessageDto;
};

export type ChatCreatedEvent = {
  type: "chat.created";
  chat: ChatDetailDto;
};

export type OutboundWsEvent =
  | ServerPongEvent
  | PresenceSubscribedEvent
  | PresenceWatchedEvent
  | PresenceUpdatedEvent
  | ChatCreatedEvent
  | ChatSubscribedEvent
  | ChatUnsubscribedEvent
  | MessageCreatedEvent
  | WsEventError;
