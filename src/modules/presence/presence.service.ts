import { NotFoundError } from "../../shared/errors/app-error";
import { PresenceRepository } from "./presence.repository";
import type { PresenceDto, SocketConnectionInput } from "./presence.types";

type PresenceServiceOptions = {
  connectionTtlSeconds: number;
};

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
}

export class PresenceService {
  readonly #repository: PresenceRepository;
  readonly #connectionTtlSeconds: number;

  constructor(repository: PresenceRepository, options: PresenceServiceOptions) {
    this.#repository = repository;
    this.#connectionTtlSeconds = options.connectionTtlSeconds;
  }

  async markConnected(input: SocketConnectionInput): Promise<void> {
    const user = await this.#repository.findUserPresenceRow(input.userId);
    if (!user) {
      throw new NotFoundError("User was not found.");
    }

    const now = new Date();
    await this.#repository.connectUserConnection({
      userId: input.userId,
      connectionId: input.connectionId,
      now,
      expiresInSeconds: this.#connectionTtlSeconds,
    });
    await this.#repository.updateLastSeenAt(input.userId, now);
  }

  async touchConnection(input: SocketConnectionInput): Promise<void> {
    const now = new Date();
    await this.#repository.touchUserConnection({
      userId: input.userId,
      connectionId: input.connectionId,
      now,
      expiresInSeconds: this.#connectionTtlSeconds,
    });
    await this.#repository.updateLastSeenAt(input.userId, now);
  }

  async markDisconnected(input: SocketConnectionInput): Promise<void> {
    const now = new Date();
    const activeConnections = await this.#repository.disconnectUserConnection({
      userId: input.userId,
      connectionId: input.connectionId,
      now,
    });

    if (activeConnections === 0) {
      await this.#repository.updateLastSeenAt(input.userId, now);
    }
  }

  async getMyPresence(currentUserId: string): Promise<PresenceDto> {
    return this.getUserPresence(currentUserId);
  }

  async getUserPresence(userId: string): Promise<PresenceDto> {
    const user = await this.#repository.findUserPresenceRow(userId);
    if (!user) {
      throw new NotFoundError("User was not found.");
    }

    const activeConnections = await this.#repository.countActiveConnections(
      userId,
      new Date(),
    );

    return {
      userId: user.id,
      isOnline: activeConnections > 0,
      lastSeenAt: user.lastSeenAt ? toIsoDate(user.lastSeenAt) : null,
    };
  }

  async subscribeCurrentUserPresence(currentUserId: string): Promise<PresenceDto> {
    return this.getUserPresence(currentUserId);
  }

  async watchUsersPresence(
    currentUserId: string,
    userIds: string[],
  ): Promise<{
    watchedUserIds: string[];
    snapshots: PresenceDto[];
  }> {
    // Продуктовое правило: presence видим всем аутентифицированным пользователям.
    const watchedUserIds = Array.from(new Set([...userIds, currentUserId]));
    const snapshots = await Promise.all(
      watchedUserIds.map(async (userId) => this.getUserPresence(userId)),
    );

    return {
      watchedUserIds,
      snapshots,
    };
  }

  async registerRealtimeConnection(input: SocketConnectionInput): Promise<PresenceDto> {
    await this.markConnected(input);
    return this.getUserPresence(input.userId);
  }

  async unregisterRealtimeConnection(input: SocketConnectionInput): Promise<PresenceDto> {
    await this.markDisconnected(input);
    return this.getUserPresence(input.userId);
  }
}
