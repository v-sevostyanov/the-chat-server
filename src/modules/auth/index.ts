import fp from "fastify-plugin";
import { AuthHandlers } from "./auth.handlers";
import { AuthRepository } from "./auth.repository";
import { authRoutes } from "./auth.routes";
import { AuthService } from "./auth.service";
import { AuthTokenService } from "./auth.tokens";

export const authModule = fp(
  async (fastify) => {
    const repository = new AuthRepository(fastify.db);
    const tokenService = new AuthTokenService({
      jwt: fastify.jwt,
      accessTokenTtlSeconds: fastify.config.accessTokenTtlSeconds,
      refreshTokenTtlSeconds: fastify.config.refreshTokenTtlSeconds,
    });
    const service = new AuthService(repository, tokenService);
    const handlers = new AuthHandlers(service);

    await fastify.register(authRoutes, { handlers });
  },
  {
    name: "auth-module",
    encapsulate: true,
  },
);
