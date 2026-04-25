import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { PresenceHandlers } from "./presence.handlers";
import {
  PresenceErrorResponseSchema,
  PresenceResponseSchema,
  PresenceUserParamsSchema,
} from "./presence.schemas";

type PresenceRoutesOptions = {
  readonly handlers: PresenceHandlers;
};

export const presenceRoutes: FastifyPluginAsyncTypebox<PresenceRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.get(
    "/me",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["presence"],
        operationId: "getMyPresence",
        summary: "Получить presence текущего пользователя",
        description:
          "Возвращает presence-состояние текущего аутентифицированного пользователя.",
        security: [{ bearerAuth: [] }],
        response: {
          200: PresenceResponseSchema,
          401: PresenceErrorResponseSchema,
          404: PresenceErrorResponseSchema,
        },
      },
      handler: options.handlers.getMyPresence,
    },
  );

  fastify.get(
    "/users/:userId",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["presence"],
        operationId: "getUserPresence",
        summary: "Получить presence пользователя",
        description:
          "Возвращает online/offline presence-состояние для указанного user id.",
        security: [{ bearerAuth: [] }],
        params: PresenceUserParamsSchema,
        response: {
          200: PresenceResponseSchema,
          401: PresenceErrorResponseSchema,
          404: PresenceErrorResponseSchema,
        },
      },
      handler: options.handlers.getUserPresence,
    },
  );
};
