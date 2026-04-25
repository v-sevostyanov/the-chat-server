import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { newDb } from "pg-mem";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app/app";
import type {
  RedisClient,
  RedisMulti,
  RedisSubscriber,
} from "../../src/plugins/redis/redis.plugin";
import * as schema from "../../src/db/schema";

type PgMemPool = {
  end: () => Promise<void>;
};

function parseScore(score: string): number {
  if (score === "-inf") {
    return Number.NEGATIVE_INFINITY;
  }

  if (score === "+inf") {
    return Number.POSITIVE_INFINITY;
  }

  return Number(score);
}

class MockRedisMulti implements RedisMulti {
  readonly #redis: MockRedis;
  readonly #operations: Array<() => unknown> = [];

  constructor(redis: MockRedis) {
    this.#redis = redis;
  }

  zremrangebyscore(key: string, min: string, max: string): RedisMulti {
    this.#operations.push(() => this.#redis.executeZRemRangeByScore(key, min, max));
    return this;
  }

  zadd(key: string, score: string, member: string): RedisMulti {
    this.#operations.push(() => this.#redis.executeZAdd(key, score, member));
    return this;
  }

  zrem(key: string, member: string): RedisMulti {
    this.#operations.push(() => this.#redis.executeZRem(key, member));
    return this;
  }

  zcard(key: string): RedisMulti {
    this.#operations.push(() => this.#redis.executeZCard(key));
    return this;
  }

  expire(key: string, seconds: number): RedisMulti {
    this.#operations.push(() => this.#redis.executeExpire(key, seconds));
    return this;
  }

  async exec(): Promise<Array<[Error | null, unknown]>> {
    const results: Array<[Error | null, unknown]> = [];

    for (const operation of this.#operations) {
      try {
        results.push([null, operation()]);
      } catch (error) {
        results.push([error as Error, null]);
      }
    }

    return results;
  }
}

class MockRedisSubscriber implements RedisSubscriber {
  readonly #redis: MockRedis;
  readonly #channels = new Set<string>();
  readonly #listeners = new Set<(channel: string, message: string) => void>();

  constructor(redis: MockRedis) {
    this.#redis = redis;
  }

  async connect(): Promise<string> {
    return "OK";
  }

  async subscribe(channel: string): Promise<number> {
    this.#channels.add(channel);
    return this.#channels.size;
  }

  on(
    event: "message",
    listener: (channel: string, message: string) => void,
  ): void {
    if (event !== "message") {
      return;
    }

    this.#listeners.add(listener);
  }

  async quit(): Promise<string> {
    this.#redis.unregisterSubscriber(this);
    return "OK";
  }

  hasChannel(channel: string): boolean {
    return this.#channels.has(channel);
  }

  emitMessage(channel: string, message: string): void {
    for (const listener of this.#listeners) {
      listener(channel, message);
    }
  }
}

export class MockRedis implements RedisClient {
  readonly #shouldFailPing: boolean;
  readonly #sortedSets = new Map<string, Map<string, number>>();
  readonly #keyExpirations = new Map<string, number>();
  readonly #subscribers = new Set<MockRedisSubscriber>();

  constructor(shouldFailPing = false) {
    this.#shouldFailPing = shouldFailPing;
  }

  multi(): RedisMulti {
    return new MockRedisMulti(this);
  }

  async publish(channel: string, message: string): Promise<number> {
    let delivered = 0;
    for (const subscriber of this.#subscribers) {
      if (!subscriber.hasChannel(channel)) {
        continue;
      }

      subscriber.emitMessage(channel, message);
      delivered += 1;
    }

    return delivered;
  }

  duplicate(): RedisSubscriber {
    const subscriber = new MockRedisSubscriber(this);
    this.#subscribers.add(subscriber);
    return subscriber;
  }

  executeZRemRangeByScore(key: string, min: string, max: string): number {
    this.#cleanupExpiredKey(key);
    const set = this.#sortedSets.get(key);
    if (!set) {
      return 0;
    }

    const minValue = parseScore(min);
    const maxValue = parseScore(max);

    let removed = 0;
    for (const [member, score] of set.entries()) {
      if (score >= minValue && score <= maxValue) {
        set.delete(member);
        removed += 1;
      }
    }

    if (set.size === 0) {
      this.#sortedSets.delete(key);
      this.#keyExpirations.delete(key);
    }

    return removed;
  }

  executeZAdd(key: string, score: string, member: string): number {
    this.#cleanupExpiredKey(key);
    const numericScore = Number(score);
    if (Number.isNaN(numericScore)) {
      throw new Error("Invalid zadd score.");
    }

    const set = this.#getOrCreateSet(key);
    const isNew = !set.has(member);
    set.set(member, numericScore);
    return isNew ? 1 : 0;
  }

  executeZRem(key: string, member: string): number {
    this.#cleanupExpiredKey(key);
    const set = this.#sortedSets.get(key);
    if (!set) {
      return 0;
    }

    const removed = set.delete(member) ? 1 : 0;
    if (set.size === 0) {
      this.#sortedSets.delete(key);
      this.#keyExpirations.delete(key);
    }

    return removed;
  }

  executeZCard(key: string): number {
    this.#cleanupExpiredKey(key);
    const set = this.#sortedSets.get(key);
    return set ? set.size : 0;
  }

  executeExpire(key: string, seconds: number): number {
    this.#cleanupExpiredKey(key);
    if (!this.#sortedSets.has(key)) {
      return 0;
    }

    this.#keyExpirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ping(): Promise<string> {
    if (this.#shouldFailPing) {
      throw new Error("Redis is unavailable");
    }

    return "PONG";
  }

  async quit(): Promise<string> {
    return "OK";
  }

  unregisterSubscriber(subscriber: MockRedisSubscriber): void {
    this.#subscribers.delete(subscriber);
  }

  #getOrCreateSet(key: string): Map<string, number> {
    const existing = this.#sortedSets.get(key);
    if (existing) {
      return existing;
    }

    const created = new Map<string, number>();
    this.#sortedSets.set(key, created);
    return created;
  }

  #cleanupExpiredKey(key: string): void {
    const expiresAt = this.#keyExpirations.get(key);
    if (expiresAt !== undefined && Date.now() >= expiresAt) {
      this.#keyExpirations.delete(key);
      this.#sortedSets.delete(key);
    }
  }
}

export async function createTestApp(options?: {
  readonly redis?: RedisClient;
  readonly env?: Partial<NodeJS.ProcessEnv>;
}): Promise<{
  app: FastifyInstance;
  pool: PgMemPool;
}> {
  const database = newDb();

  const migrationsDir = path.resolve(process.cwd(), "src/db/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const migrationFile of migrationFiles) {
    const migrationPath = path.resolve(migrationsDir, migrationFile);
    const migrationSql = readFileSync(migrationPath, "utf8");
    database.public.none(migrationSql);
  }

  const pg = database.adapters.createPg();
  const pool = new pg.Pool();
  const originalQuery = pool.query.bind(pool);
  pool.query = (async (...args: Parameters<typeof pool.query>) => {
    const [first] = args;
    if (typeof first === "object" && first !== null) {
      const queryConfig = { ...(first as Record<string, unknown>) };
      const expectsArrayRows = queryConfig.rowMode === "array";
      delete queryConfig.types;
      delete queryConfig.rowMode;
      const rest = args.slice(1) as unknown[];
      const result = await originalQuery(
        queryConfig as never,
        ...(rest as never[]),
      );

      if (expectsArrayRows && Array.isArray(result.rows)) {
        const rows = result.rows.map((row: unknown) =>
          Array.isArray(row)
            ? row
            : Object.values(row as Record<string, unknown>),
        );
        return {
          ...result,
          rows,
        };
      }

      return result;
    }

    return originalQuery(...args);
  }) as typeof pool.query;

  const db = drizzle(pool, { schema });
  const defaultEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DATABASE_URL: "postgres://test:test@127.0.0.1:5432/thechat_test",
    REDIS_URL: "redis://127.0.0.1:6379",
    JWT_SECRET: "test-secret-with-minimum-length",
    ACCESS_TOKEN_TTL_SECONDS: "900",
    REFRESH_TOKEN_TTL_SECONDS: "2592000",
    SWAGGER_ENABLED: "false",
    WS_PATH: "/ws",
    WS_MAX_PAYLOAD_BYTES: "65536",
    WS_HEARTBEAT_INTERVAL_MS: "30000",
    WS_REALTIME_CHANNEL: "thechat:realtime:events",
    PRESENCE_CONNECTION_TTL_SECONDS: "90",
    CORS_ALLOWED_ORIGINS: "",
    TRUST_PROXY: "false",
    HOST: "127.0.0.1",
    PORT: "3001",
  };

  const app = await buildApp({
    logger: false,
    env: {
      ...defaultEnv,
      ...options?.env,
    },
    dependencies: {
      db,
      redis: options?.redis ?? new MockRedis(),
    },
  });

  return { app, pool };
}
