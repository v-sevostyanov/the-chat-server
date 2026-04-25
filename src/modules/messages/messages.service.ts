import { randomUUID } from "node:crypto";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error";
import { toMessageDto, toMessageHistoryPageDto } from "./messages.mapper";
import { MessagesRepository } from "./messages.repository";
import type {
  CreateMessageInput,
  CreateMessageResult,
  GetMessageByIdInput,
  ListChatMessagesInput,
} from "./messages.types";

export class MessagesService {
  readonly #repository: MessagesRepository;

  constructor(repository: MessagesRepository) {
    this.#repository = repository;
  }

  async createMessage(input: CreateMessageInput) {
    const result = await this.createMessageWithRecipients(input);
    return result.message;
  }

  async createMessageWithRecipients(
    input: CreateMessageInput,
  ): Promise<CreateMessageResult> {
    const normalizedBody = input.body.trim();
    if (normalizedBody.length === 0) {
      throw new BadRequestError("Message body cannot be empty.");
    }

    const clientMessageId = input.clientMessageId?.trim();
    if (clientMessageId !== undefined && clientMessageId.length === 0) {
      throw new BadRequestError("clientMessageId cannot be empty.");
    }

    const createdMessage = await this.#repository.createMessageForMember({
      id: randomUUID(),
      chatId: input.chatId,
      senderId: input.currentUserId,
      clientMessageId,
      body: normalizedBody,
    });
    if (!createdMessage) {
      throw new NotFoundError("Chat was not found.");
    }

    if (!createdMessage.created && createdMessage.body !== normalizedBody) {
      throw new ConflictError(
        "clientMessageId already belongs to a different message.",
        {
          clientMessageId,
        },
      );
    }

    const message = await this.#repository.getMessageByIdForUser(
      createdMessage.id,
      input.currentUserId,
    );
    if (!message) {
      throw new NotFoundError("Message was not found.");
    }

    const recipientUserIds = createdMessage.created
      ? await this.#repository.listChatMemberUserIds(input.chatId)
      : [];

    return {
      message: toMessageDto(message),
      recipientUserIds,
      created: createdMessage.created,
    };
  }

  async listChatMessages(input: ListChatMessagesInput) {
    const isMember = await this.#repository.isChatMember(
      input.chatId,
      input.currentUserId,
    );
    if (!isMember) {
      throw new NotFoundError("Chat was not found.");
    }

    if (
      (input.beforeCreatedAt && !input.beforeMessageId) ||
      (!input.beforeCreatedAt && input.beforeMessageId)
    ) {
      throw new BadRequestError(
        "Pagination cursor must include both beforeCreatedAt and beforeMessageId.",
      );
    }

    const beforeCreatedAt = input.beforeCreatedAt
      ? new Date(input.beforeCreatedAt)
      : undefined;

    if (beforeCreatedAt && Number.isNaN(beforeCreatedAt.getTime())) {
      throw new BadRequestError("beforeCreatedAt must be a valid date-time.");
    }

    const rows = await this.#repository.listChatMessagesForUser({
      chatId: input.chatId,
      userId: input.currentUserId,
      limit: input.limit,
      beforeCreatedAt,
      beforeMessageId: input.beforeMessageId,
    });

    return toMessageHistoryPageDto(rows, input.limit);
  }

  async getMessageById(input: GetMessageByIdInput) {
    const message = await this.#repository.getMessageByIdForUser(
      input.messageId,
      input.currentUserId,
    );

    if (!message) {
      throw new NotFoundError("Message was not found.");
    }

    return toMessageDto(message);
  }
}
