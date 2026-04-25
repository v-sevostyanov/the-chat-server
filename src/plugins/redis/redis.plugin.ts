import fp from "fastify-plugin";
import Redis from "ioredis";

export type RedisMulti = {
  zremrangebyscore: (
    key: string,
    min: string,
    max: string,
  ) => RedisMulti;
  zadd: (key: string, score: string, member: string) => RedisMulti;
  zrem: (key: string, member: string) => RedisMulti;
  zcard: (key: string) => RedisMulti;
  expire: (key: string, seconds: number) => RedisMulti;
  exec: () => Promise<Array<[Error | null, unknown]> | null>;
};

export type RedisSubscriber = {
  connect: () => Promise<unknown>;
  subscribe: (...channels: string[]) => Promise<unknown>;
  on: (
    event: "message",
    listener: (channel: string, message: string) => void,
  ) => void;
  quit: () => Promise<unknown>;
};

export type RedisClient = {
  ping: () => Promise<string>;
  multi: () => RedisMulti;
  publish: (channel: string, message: string) => Promise<unknown>;
  duplicate: () => RedisSubscriber;
  quit: () => Promise<unknown>;
};

type RedisPluginOptions = {
  readonly redis?: RedisClient;
};

export const redisPlugin = fp<RedisPluginOptions>(
  async (fastify, options) => {
    if (options.redis) {
      fastify.decorate("redis", options.redis);
      fastify.decorate("checkRedisReadiness", async () => {
        await options.redis?.ping();
      });
      return;
    }

    const redis = new Redis(fastify.config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    await redis.connect();

    fastify.decorate("redis", redis);
    fastify.decorate("checkRedisReadiness", async () => {
      await redis.ping();
    });

    fastify.addHook("onClose", async () => {
      await redis.quit();
    });
  },
  {
    name: "redis-plugin",
  },
);
