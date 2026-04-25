import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { AuthHandlers } from "./auth.handlers";
import {
  AuthErrorResponseSchema,
  AuthResponseSchema,
  LoginBodySchema,
  LogoutBodySchema,
  LogoutResponseSchema,
  RefreshBodySchema,
  RegisterBodySchema,
  SessionUserResponseSchema,
} from "./auth.schemas";

type AuthRoutesOptions = {
  readonly handlers: AuthHandlers;
};

export const authRoutes: FastifyPluginAsyncTypebox<AuthRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        operationId: "register",
        summary: "Зарегистрировать пользователя",
        description:
          "Создаёт нового пользователя и возвращает начальную пару токенов.",
        body: RegisterBodySchema,
        response: {
          201: AuthResponseSchema,
          400: AuthErrorResponseSchema,
          409: AuthErrorResponseSchema,
        },
      },
      handler: options.handlers.register,
    },
  );

  fastify.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        operationId: "login",
        summary: "Войти по учётным данным",
        description: "Проверяет учётные данные и возвращает пару токенов.",
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          400: AuthErrorResponseSchema,
          401: AuthErrorResponseSchema,
        },
      },
      handler: options.handlers.login,
    },
  );

  fastify.get(
    "/me",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["auth"],
        operationId: "getCurrentSessionUser",
        summary: "Получить пользователя текущей сессии",
        description:
          "Определяет текущего аутентифицированного пользователя по JWT subject.",
        security: [{ bearerAuth: [] }],
        response: {
          200: SessionUserResponseSchema,
          401: AuthErrorResponseSchema,
        },
      },
      handler: options.handlers.me,
    },
  );

  fastify.post(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        operationId: "refreshAuthToken",
        summary: "Ротировать refresh token",
        description:
          "Проверяет refresh token по долговечному состоянию сессии и возвращает новую пару токенов.",
        body: RefreshBodySchema,
        response: {
          200: AuthResponseSchema,
          400: AuthErrorResponseSchema,
          401: AuthErrorResponseSchema,
        },
      },
      handler: options.handlers.refresh,
    },
  );

  fastify.post(
    "/logout",
    {
      schema: {
        tags: ["auth"],
        operationId: "logout",
        summary: "Завершить сессию",
        description:
          "Отзывает refresh-сессию, связанную с переданным refresh token.",
        body: LogoutBodySchema,
        response: {
          204: LogoutResponseSchema,
          400: AuthErrorResponseSchema,
          401: AuthErrorResponseSchema,
        },
      },
      handler: options.handlers.logout,
    },
  );
};
