import type { FastifyReply, FastifyRequest } from "fastify";
import type { ChatsService } from "./chats.service";
import type { RealtimeTransport } from "../../plugins/websocket/realtime.types";

type CreateDirectChatRequest = FastifyRequest<{
  Body: {
    targetUserId: string;
    title?: string;
  };
}>;

type CreateGroupChatRequest = FastifyRequest<{
  Body: {
    title: string;
    participantUserIds: string[];
  };
}>;

type ListChatsRequest = FastifyRequest<{
  Querystring: {
    limit?: number;
    offset?: number;
  };
}>;

type GetChatByIdRequest = FastifyRequest<{
  Params: {
    chatId: string;
  };
}>;

export class ChatsHandlers {
  readonly #service: ChatsService;
  readonly #realtime: RealtimeTransport;
  readonly #logger: Pick<FastifyRequest["log"], "error">;

  constructor(
    service: ChatsService,
    realtime: RealtimeTransport,
    logger: Pick<FastifyRequest["log"], "error">,
  ) {
    this.#service = service;
    this.#realtime = realtime;
    this.#logger = logger;
  }

  createDirectChat = async (
    request: CreateDirectChatRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.#service.createDirectChat({
      currentUserId: request.user.sub,
      targetUserId: request.body.targetUserId,
      title: request.body.title,
    });

    if (result.created) {
      try {
        await this.#realtime.publishChatCreated({
          recipientUserIds: result.chat.members.map((member) => member.userId),
          chat: result.chat,
        });
      } catch (error) {
        this.#logger.error(
          { err: error, chatId: result.chat.id },
          "Failed to publish realtime chat.created event.",
        );
      }
    }

    reply.code(result.created ? 201 : 200).send({ data: result.chat });
  };

  createGroupChat = async (
    request: CreateGroupChatRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.#service.createGroupChat({
      currentUserId: request.user.sub,
      title: request.body.title,
      participantUserIds: request.body.participantUserIds,
    });

    try {
      await this.#realtime.publishChatCreated({
        recipientUserIds: result.chat.members.map((member) => member.userId),
        chat: result.chat,
      });
    } catch (error) {
      this.#logger.error(
        { err: error, chatId: result.chat.id },
        "Failed to publish realtime chat.created event.",
      );
    }

    reply.code(201).send({ data: result.chat });
  };

  listChats = async (request: ListChatsRequest, reply: FastifyReply): Promise<void> => {
    const chats = await this.#service.listChats({
      currentUserId: request.user.sub,
      limit: request.query.limit ?? 20,
      offset: request.query.offset ?? 0,
    });

    reply.code(200).send({ data: chats });
  };

  getChatById = async (
    request: GetChatByIdRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const chat = await this.#service.getChatById({
      currentUserId: request.user.sub,
      chatId: request.params.chatId,
    });

    reply.code(200).send({ data: chat });
  };
}
