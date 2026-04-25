import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type { AppDb } from "../db/client";
import { modulesPlugin } from "../modules";
import { authPlugin } from "../plugins/auth/auth.plugin";
import { configPlugin } from "../plugins/config/config.plugin";
import { corsPlugin } from "../plugins/cors/cors.plugin";
import { dbPlugin } from "../plugins/db/db.plugin";
import { docsPlugin } from "../plugins/docs/docs.plugin";
import { errorsPlugin } from "../plugins/errors/errors.plugin";
import type { RedisClient } from "../plugins/redis/redis.plugin";
import { redisPlugin } from "../plugins/redis/redis.plugin";
import { websocketPlugin } from "../plugins/websocket/websocket.plugin";
import { loadConfig, type AppConfig } from "./config";

export type BuildAppOptions = {
  readonly env?: NodeJS.ProcessEnv;
  readonly config?: AppConfig;
  readonly logger?: FastifyServerOptions["logger"];
  readonly dependencies?: {
    readonly db?: AppDb;
    readonly redis?: RedisClient;
  };
};

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig(options.env ?? process.env);

  const app = Fastify({
    logger: options.logger ?? {
      level: config.logLevel,
    },
    trustProxy: config.trustProxy,
  });

  await app.register(configPlugin, { config });
  await app.register(corsPlugin);
  await app.register(errorsPlugin);

  await app.register(dbPlugin, {
    db: options.dependencies?.db,
  });

  await app.register(redisPlugin, {
    redis: options.dependencies?.redis,
  });

  await app.register(authPlugin);
  await app.register(websocketPlugin);
  await app.register(docsPlugin);
  await app.register(modulesPlugin);

  return app;
}
