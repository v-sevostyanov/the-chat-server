import { eq } from "drizzle-orm";
import type { AppDb } from "../../db/client";
import { users } from "../../db/schema";
import type { RedisClient } from "../../plugins/redis/redis.plugin";

type RedisTransactionResult = Array<[Error | null, unknown]> | null;

type ConnectUserConnectionInput = {
  userId: string;
  connectionId: string;
  now: Date;
  expiresInSeconds: number;
};

type TouchUserConnectionInput = ConnectUserConnectionInput;

type DisconnectUserConnectionInput = {
  userId: string;
  connectionId: string;
  now: Date;
};

type UserPresenceRow = {
  id: string;
  lastSeenAt: Date | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function getTransactionValue(
  transactionResult: RedisTransactionResult,
  index: number,
): unknown {
  if (!transactionResult) {
    throw new Error("Redis transaction result is invalid.");
  }

  for (const [error] of transactionResult) {
    if (error) {
      throw error;
    }
  }

  const result = transactionResult?.[index];
  if (!result) {
    throw new Error("Redis transaction result is invalid.");
  }

  const [, value] = result;

  return value;
}

function userConnectionsKey(userId: string): string {
  return `presence:user:${userId}:connections`;
}

export class PresenceRepository {
  readonly #redis: RedisClient;
  readonly #db: AppDb;

  constructor(redis: RedisClient, db: AppDb) {
    this.#redis = redis;
    this.#db = db;
  }

  async connectUserConnection(input: ConnectUserConnectionInput): Promise<number> {
    const key = userConnectionsKey(input.userId);
    const expiresAtMs = input.now.getTime() + input.expiresInSeconds * 1000;

    const result = await this.#redis
      .multi()
      .zremrangebyscore(key, "-inf", String(input.now.getTime()))
      .zadd(key, String(expiresAtMs), input.connectionId)
      .expire(key, input.expiresInSeconds)
      .zcard(key)
      .exec();

    return toNumber(getTransactionValue(result, 3));
  }

  async touchUserConnection(input: TouchUserConnectionInput): Promise<void> {
    const key = userConnectionsKey(input.userId);
    const expiresAtMs = input.now.getTime() + input.expiresInSeconds * 1000;

    await this.#redis
      .multi()
      .zremrangebyscore(key, "-inf", String(input.now.getTime()))
      .zadd(key, String(expiresAtMs), input.connectionId)
      .expire(key, input.expiresInSeconds)
      .exec();
  }

  async disconnectUserConnection(input: DisconnectUserConnectionInput): Promise<number> {
    const key = userConnectionsKey(input.userId);

    const result = await this.#redis
      .multi()
      .zremrangebyscore(key, "-inf", String(input.now.getTime()))
      .zrem(key, input.connectionId)
      .zcard(key)
      .exec();

    return toNumber(getTransactionValue(result, 2));
  }

  async countActiveConnections(userId: string, now: Date): Promise<number> {
    const key = userConnectionsKey(userId);
    const result = await this.#redis
      .multi()
      .zremrangebyscore(key, "-inf", String(now.getTime()))
      .zcard(key)
      .exec();

    return toNumber(getTransactionValue(result, 1));
  }

  async findUserPresenceRow(userId: string): Promise<UserPresenceRow | null> {
    const [row] = await this.#db
      .select({
        id: users.id,
        lastSeenAt: users.lastSeenAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async updateLastSeenAt(userId: string, lastSeenAt: Date): Promise<void> {
    await this.#db
      .update(users)
      .set({
        lastSeenAt,
      })
      .where(eq(users.id, userId));
  }
}
