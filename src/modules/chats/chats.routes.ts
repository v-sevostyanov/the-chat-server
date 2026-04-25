import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { ChatsHandlers } from "./chats.handlers";
import {
  ChatDetailResponseSchema,
  ChatIdParamsSchema,
  ChatListResponseSchema,
  ChatsErrorResponseSchema,
  CreateDirectChatBodySchema,
  CreateGroupChatBodySchema,
  ListChatsQuerySchema,
} from "./chats.schemas";

type ChatsRoutesOptions = {
  readonly handlers: ChatsHandlers;
};

export const chatsRoutes: FastifyPluginAsyncTypebox<ChatsRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.post(
    "/direct",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["chats"],
        operationId: "createDirectChat",
        summary: "Создать или получить direct chat",
        description:
          "Создаёт direct chat между текущим и целевым пользователем или возвращает существующий чат для этой пары.",
        security: [{ bearerAuth: [] }],
        body: CreateDirectChatBodySchema,
        response: {
          200: ChatDetailResponseSchema,
          201: ChatDetailResponseSchema,
          400: ChatsErrorResponseSchema,
          401: ChatsErrorResponseSchema,
          404: ChatsErrorResponseSchema,
        },
      },
      handler: options.handlers.createDirectChat,
    },
  );

  fastify.post(
    "/group",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["chats"],
        operationId: "createGroupChat",
        summary: "Создать group chat",
        description:
          "Создаёт group chat и добавляет создателя вместе с начальными участниками.",
        security: [{ bearerAuth: [] }],
        body: CreateGroupChatBodySchema,
        response: {
          201: ChatDetailResponseSchema,
          400: ChatsErrorResponseSchema,
          401: ChatsErrorResponseSchema,
        },
      },
      handler: options.handlers.createGroupChat,
    },
  );

  fastify.get(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["chats"],
        operationId: "listChats",
        summary: "Получить чаты текущего пользователя",
        description:
          "Возвращает чаты, видимые текущему аутентифицированному пользователю.",
        security: [{ bearerAuth: [] }],
        querystring: ListChatsQuerySchema,
        response: {
          200: ChatListResponseSchema,
          400: ChatsErrorResponseSchema,
          401: ChatsErrorResponseSchema,
        },
      },
      handler: options.handlers.listChats,
    },
  );

  fastify.get(
    "/:chatId",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["chats"],
        operationId: "getChatById",
        summary: "Получить чат по id",
        description: "Возвращает детали чата для участника этого чата.",
        security: [{ bearerAuth: [] }],
        params: ChatIdParamsSchema,
        response: {
          200: ChatDetailResponseSchema,
          401: ChatsErrorResponseSchema,
          404: ChatsErrorResponseSchema,
        },
      },
      handler: options.handlers.getChatById,
    },
  );
};
