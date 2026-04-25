import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { UsersHandlers } from "./users.handlers";
import {
  ListUsersQuerySchema,
  ListUsersResponseSchema,
  UpdateCurrentUserBodySchema,
  UserIdParamsSchema,
  UserResponseSchema,
  UsersErrorResponseSchema,
} from "./users.schemas";

type UsersRoutesOptions = {
  readonly handlers: UsersHandlers;
};

export const usersRoutes: FastifyPluginAsyncTypebox<UsersRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.get(
    "/me",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["users"],
        operationId: "getCurrentUserProfile",
        summary: "Получить профиль текущего пользователя",
        description:
          "Возвращает данные профиля аутентифицированного пользователя.",
        security: [{ bearerAuth: [] }],
        response: {
          200: UserResponseSchema,
          401: UsersErrorResponseSchema,
          404: UsersErrorResponseSchema,
        },
      },
      handler: options.handlers.getCurrentUser,
    },
  );

  fastify.patch(
    "/me",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["users"],
        operationId: "updateCurrentUserProfile",
        summary: "Обновить профиль текущего пользователя",
        description:
          "Обновляет разрешённые поля профиля аутентифицированного пользователя и возвращает обновлённый профиль.",
        security: [{ bearerAuth: [] }],
        body: UpdateCurrentUserBodySchema,
        response: {
          200: UserResponseSchema,
          400: UsersErrorResponseSchema,
          401: UsersErrorResponseSchema,
          404: UsersErrorResponseSchema,
          409: UsersErrorResponseSchema,
        },
      },
      handler: options.handlers.updateCurrentUser,
    },
  );

  fastify.get(
    "/:userId",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["users"],
        operationId: "getUserById",
        summary: "Получить пользователя по id",
        description:
          "Возвращает безопасные данные профиля для указанного user id.",
        security: [{ bearerAuth: [] }],
        params: UserIdParamsSchema,
        response: {
          200: UserResponseSchema,
          401: UsersErrorResponseSchema,
          404: UsersErrorResponseSchema,
        },
      },
      handler: options.handlers.getUserById,
    },
  );

  fastify.get(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["users"],
        operationId: "listUsersForLookup",
        summary: "Получить список пользователей для поиска",
        description:
          "Возвращает безопасные профили пользователей с опциональной пагинацией и текстовым поиском.",
        security: [{ bearerAuth: [] }],
        querystring: ListUsersQuerySchema,
        response: {
          200: ListUsersResponseSchema,
          400: UsersErrorResponseSchema,
          401: UsersErrorResponseSchema,
        },
      },
      handler: options.handlers.listUsers,
    },
  );
};
