import "fastify";
import type { AppConfig } from "./config";
import type { AppDb } from "../db/client";
import type { RedisClient } from "../plugins/redis/redis.plugin";
import type { RealtimeTransport } from "../plugins/websocket/realtime.types";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    db: AppDb;
    redis: RedisClient;
    realtime: RealtimeTransport;
    authenticate: import("fastify").preHandlerAsyncHookHandler;
    checkDatabaseReadiness: () => Promise<void>;
    checkRedisReadiness: () => Promise<void>;
  }
}
