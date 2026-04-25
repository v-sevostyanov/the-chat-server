import type { FastifyReply, FastifyRequest } from "fastify";
import type { MessagesService } from "./messages.service";
import type { RealtimeTransport } from "../../plugins/websocket/realtime.types";

type CreateMessageRequest = FastifyRequest<{
  Body: {
    chatId: string;
    clientMessageId?: string;
    body: string;
  };
}>;

type ListChatMessagesRequest = FastifyRequest<{
  Params: {
    chatId: string;
  };
  Querystring: {
    limit?: number;
    beforeCreatedAt?: string;
    beforeMessageId?: string;
  };
}>;

type GetMessageByIdRequest = FastifyRequest<{
  Params: {
    messageId: string;
  };
}>;

export class MessagesHandlers {
  readonly #service: MessagesService;
  readonly #realtime: RealtimeTransport;
  readonly #logger: Pick<FastifyRequest["log"], "error">;

  constructor(
    service: MessagesService,
    realtime: RealtimeTransport,
    logger: Pick<FastifyRequest["log"], "error">,
  ) {
    this.#service = service;
    this.#realtime = realtime;
    this.#logger = logger;
  }

  createMessage = async (
    request: CreateMessageRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.#service.createMessageWithRecipients({
      currentUserId: request.user.sub,
      chatId: request.body.chatId,
      clientMessageId: request.body.clientMessageId,
      body: request.body.body,
    });

    if (result.created) {
      try {
        await this.#realtime.publishMessageCreated({
          chatId: result.message.chatId,
          recipientUserIds: result.recipientUserIds,
          message: result.message,
        });
      } catch (error) {
        this.#logger.error(
          { err: error, chatId: result.message.chatId, messageId: result.message.id },
          "Failed to publish realtime message event.",
        );
      }
    }

    reply.code(result.created ? 201 : 200).send({ data: result.message });
  };

  listChatMessages = async (
    request: ListChatMessagesRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const history = await this.#service.listChatMessages({
      currentUserId: request.user.sub,
      chatId: request.params.chatId,
      limit: request.query.limit ?? 50,
      beforeCreatedAt: request.query.beforeCreatedAt,
      beforeMessageId: request.query.beforeMessageId,
    });

    reply.code(200).send(history);
  };

  getMessageById = async (
    request: GetMessageByIdRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const message = await this.#service.getMessageById({
      currentUserId: request.user.sub,
      messageId: request.params.messageId,
    });

    reply.code(200).send({ data: message });
  };
}
