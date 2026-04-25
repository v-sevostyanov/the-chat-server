import fp from "fastify-plugin";
import { HealthHandlers } from "./health.handlers";
import { healthRoutes } from "./health.routes";
import { HealthService } from "./health.service";

export const healthModule = fp(
  async (fastify) => {
    const service = new HealthService([
      {
        name: "database",
        check: fastify.checkDatabaseReadiness,
      },
      {
        name: "redis",
        check: fastify.checkRedisReadiness,
      },
    ]);

    const handlers = new HealthHandlers(service);

    await fastify.register(healthRoutes, {
      handlers,
    });
  },
  {
    name: "health-module",
  },
);
