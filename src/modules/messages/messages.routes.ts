import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { MessagesHandlers } from "./messages.handlers";
import {
  CreateMessageBodySchema,
  GetMessageByIdParamsSchema,
  ListChatMessagesParamsSchema,
  ListChatMessagesQuerySchema,
  MessageHistoryResponseSchema,
  MessageResponseSchema,
  MessagesErrorResponseSchema,
} from "./messages.schemas";

type MessagesRoutesOptions = {
  readonly handlers: MessagesHandlers;
};

export const messagesRoutes: FastifyPluginAsyncTypebox<MessagesRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.post(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["messages"],
        operationId: "createMessage",
        summary: "Создать сообщение",
        description: "Создаёт текстовое сообщение в существующем чате.",
        security: [{ bearerAuth: [] }],
        body: CreateMessageBodySchema,
        response: {
          200: MessageResponseSchema,
          201: MessageResponseSchema,
          400: MessagesErrorResponseSchema,
          401: MessagesErrorResponseSchema,
          404: MessagesErrorResponseSchema,
          409: MessagesErrorResponseSchema,
        },
      },
      handler: options.handlers.createMessage,
    },
  );

  fastify.get(
    "/chat/:chatId",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["messages"],
        operationId: "listChatMessages",
        summary: "Получить сообщения чата",
        description:
          "Возвращает историю сообщений чата, отсортированную по createdAt desc и id desc, с cursor pagination.",
        security: [{ bearerAuth: [] }],
        params: ListChatMessagesParamsSchema,
        querystring: ListChatMessagesQuerySchema,
        response: {
          200: MessageHistoryResponseSchema,
          400: MessagesErrorResponseSchema,
          401: MessagesErrorResponseSchema,
          404: MessagesErrorResponseSchema,
        },
      },
      handler: options.handlers.listChatMessages,
    },
  );

  fastify.get(
    "/:messageId",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ["messages"],
        operationId: "getMessageById",
        summary: "Получить сообщение по id",
        description:
          "Возвращает одно сообщение для авторизованного участника чата.",
        security: [{ bearerAuth: [] }],
        params: GetMessageByIdParamsSchema,
        response: {
          200: MessageResponseSchema,
          401: MessagesErrorResponseSchema,
          404: MessagesErrorResponseSchema,
        },
      },
      handler: options.handlers.getMessageById,
    },
  );
};
