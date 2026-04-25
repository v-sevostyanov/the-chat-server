import type { ChatDetailDto } from "../../modules/chats/chats.types";
import type { MessageDto } from "../../modules/messages/messages.types";
import type {
  PresenceDto,
  SocketConnectionInput,
} from "../../modules/presence/presence.types";

export type PresenceWatchResult = {
  watchedUserIds: string[];
  snapshots: PresenceDto[];
};

export type PresenceRealtimeAdapter = {
  registerRealtimeConnection: (input: SocketConnectionInput) => Promise<PresenceDto>;
  unregisterRealtimeConnection: (input: SocketConnectionInput) => Promise<PresenceDto>;
  touchConnection: (input: SocketConnectionInput) => Promise<void>;
  subscribeCurrentUserPresence: (currentUserId: string) => Promise<PresenceDto>;
  watchUsersPresence: (
    currentUserId: string,
    userIds: string[],
  ) => Promise<PresenceWatchResult>;
};

export type ChatsRealtimeAdapter = {
  isUserChatMember: (chatId: string, userId: string) => Promise<boolean>;
};

export type PublishMessageCreatedInput = {
  chatId: string;
  recipientUserIds: string[];
  message: MessageDto;
};

export type PublishChatCreatedInput = {
  recipientUserIds: string[];
  chat: ChatDetailDto;
};

export type RealtimeTransport = {
  publishMessageCreated: (input: PublishMessageCreatedInput) => Promise<void>;
  publishChatCreated: (input: PublishChatCreatedInput) => Promise<void>;
  publishPresenceUpdated: (input: PresenceDto) => Promise<void>;
  bindPresenceAdapter: (adapter: PresenceRealtimeAdapter) => void;
  bindChatsAdapter: (adapter: ChatsRealtimeAdapter) => void;
  getPresenceAdapter: () => PresenceRealtimeAdapter | null;
  getChatsAdapter: () => ChatsRealtimeAdapter | null;
};
