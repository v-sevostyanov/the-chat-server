import fp from "fastify-plugin";
import { PresenceHandlers } from "./presence.handlers";
import { PresenceRepository } from "./presence.repository";
import { presenceRoutes } from "./presence.routes";
import { PresenceService } from "./presence.service";

export const presenceModule = fp(
  async (fastify) => {
    const repository = new PresenceRepository(fastify.redis, fastify.db);
    const service = new PresenceService(repository, {
      connectionTtlSeconds: fastify.config.presenceConnectionTtlSeconds,
    });
    const handlers = new PresenceHandlers(service);
    fastify.realtime.bindPresenceAdapter(service);

    await fastify.register(presenceRoutes, { handlers });
  },
  {
    name: "presence-module",
    encapsulate: true,
  },
);
