import type { WebSocket } from "ws";

type ConnectionRecord = {
  userId: string;
  socket: WebSocket;
};

export class ConnectionIndex {
  readonly #connections = new Map<string, ConnectionRecord>();
  readonly #userConnections = new Map<string, Set<string>>();
  readonly #chatSubscriptions = new Map<string, Set<string>>();
  readonly #connectionChats = new Map<string, Set<string>>();
  readonly #presenceWatchers = new Map<string, Set<string>>();
  readonly #connectionPresenceWatch = new Map<string, Set<string>>();

  addConnection(connectionId: string, userId: string, socket: WebSocket): void {
    this.#connections.set(connectionId, { userId, socket });

    const existingUserConnections = this.#userConnections.get(userId);
    if (existingUserConnections) {
      existingUserConnections.add(connectionId);
    } else {
      this.#userConnections.set(userId, new Set([connectionId]));
    }
  }

  removeConnection(connectionId: string): void {
    const connection = this.#connections.get(connectionId);
    if (!connection) {
      return;
    }

    this.#connections.delete(connectionId);

    const userConnections = this.#userConnections.get(connection.userId);
    userConnections?.delete(connectionId);
    if (userConnections && userConnections.size === 0) {
      this.#userConnections.delete(connection.userId);
    }

    const subscribedChats = this.#connectionChats.get(connectionId);
    if (subscribedChats) {
      for (const chatId of subscribedChats) {
        const chatConnections = this.#chatSubscriptions.get(chatId);
        chatConnections?.delete(connectionId);
        if (chatConnections && chatConnections.size === 0) {
          this.#chatSubscriptions.delete(chatId);
        }
      }
      this.#connectionChats.delete(connectionId);
    }

    const watchedPresenceUsers = this.#connectionPresenceWatch.get(connectionId);
    if (watchedPresenceUsers) {
      for (const watchedUserId of watchedPresenceUsers) {
        const watchers = this.#presenceWatchers.get(watchedUserId);
        watchers?.delete(connectionId);
        if (watchers && watchers.size === 0) {
          this.#presenceWatchers.delete(watchedUserId);
        }
      }
      this.#connectionPresenceWatch.delete(connectionId);
    }
  }

  subscribeConnectionToChat(connectionId: string, chatId: string): void {
    if (!this.#connections.has(connectionId)) {
      return;
    }

    const connectionChats = this.#connectionChats.get(connectionId);
    if (connectionChats) {
      connectionChats.add(chatId);
    } else {
      this.#connectionChats.set(connectionId, new Set([chatId]));
    }

    const chatConnections = this.#chatSubscriptions.get(chatId);
    if (chatConnections) {
      chatConnections.add(connectionId);
    } else {
      this.#chatSubscriptions.set(chatId, new Set([connectionId]));
    }
  }

  unsubscribeConnectionFromChat(connectionId: string, chatId: string): void {
    if (!this.#connections.has(connectionId)) {
      return;
    }

    const connectionChats = this.#connectionChats.get(connectionId);
    connectionChats?.delete(chatId);
    if (connectionChats && connectionChats.size === 0) {
      this.#connectionChats.delete(connectionId);
    }

    const chatConnections = this.#chatSubscriptions.get(chatId);
    chatConnections?.delete(connectionId);
    if (chatConnections && chatConnections.size === 0) {
      this.#chatSubscriptions.delete(chatId);
    }
  }

  setPresenceWatchList(connectionId: string, userIds: string[]): void {
    if (!this.#connections.has(connectionId)) {
      return;
    }

    const previousWatchList = this.#connectionPresenceWatch.get(connectionId);
    if (previousWatchList) {
      for (const previousUserId of previousWatchList) {
        const watchers = this.#presenceWatchers.get(previousUserId);
        watchers?.delete(connectionId);
        if (watchers && watchers.size === 0) {
          this.#presenceWatchers.delete(previousUserId);
        }
      }
    }

    const normalizedUserIds = Array.from(new Set(userIds));
    this.#connectionPresenceWatch.set(connectionId, new Set(normalizedUserIds));

    for (const userId of normalizedUserIds) {
      const watchers = this.#presenceWatchers.get(userId);
      if (watchers) {
        watchers.add(connectionId);
      } else {
        this.#presenceWatchers.set(userId, new Set([connectionId]));
      }
    }
  }

  getConnection(connectionId: string): ConnectionRecord | null {
    return this.#connections.get(connectionId) ?? null;
  }

  hasConnection(connectionId: string): boolean {
    return this.#connections.has(connectionId);
  }

  listPresenceWatcherConnectionIds(userId: string): string[] {
    const watchers = this.#presenceWatchers.get(userId);
    if (!watchers) {
      return [];
    }

    return Array.from(watchers.values());
  }

  listChatConnectionIds(chatId: string): string[] {
    const subscribers = this.#chatSubscriptions.get(chatId);
    if (!subscribers) {
      return [];
    }

    return Array.from(subscribers.values());
  }

  listUserConnectionIds(userId: string): string[] {
    const connections = this.#userConnections.get(userId);
    if (!connections) {
      return [];
    }

    return Array.from(connections.values());
  }
}
