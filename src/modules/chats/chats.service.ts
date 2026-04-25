import { randomUUID } from "node:crypto";
import { BadRequestError, NotFoundError } from "../../shared/errors/app-error";
import { isPgUniqueViolationError } from "../../shared/db/errors";
import { toChatDetailDto, toChatSummaryDto } from "./chats.mapper";
import { ChatsRepository } from "./chats.repository";
import type {
  CreateDirectChatInput,
  CreateGroupChatInput,
  GetChatByIdInput,
  ListChatsInput,
} from "./chats.types";

type CreateChatResult = {
  chat: ReturnType<typeof toChatDetailDto>;
  created: boolean;
};

export class ChatsService {
  readonly #repository: ChatsRepository;

  constructor(repository: ChatsRepository) {
    this.#repository = repository;
  }

  async createDirectChat(input: CreateDirectChatInput): Promise<CreateChatResult> {
    if (input.currentUserId === input.targetUserId) {
      throw new BadRequestError("Direct chat with yourself is not allowed.");
    }

    const normalizedTitle = input.title?.trim();
    const directTitle = normalizedTitle && normalizedTitle.length > 0
      ? normalizedTitle
      : null;

    const targetExists = await this.#repository.userExists(input.targetUserId);
    if (!targetExists) {
      throw new NotFoundError("Target user was not found.");
    }

    const existingChatId = await this.#repository.findExistingDirectChatId(
      input.currentUserId,
      input.targetUserId,
    );

    if (existingChatId) {
      const existingChat = await this.#repository.getChatByIdForMember(
        existingChatId,
        input.currentUserId,
      );
      if (!existingChat) {
        throw new NotFoundError("Chat was not found.");
      }

      const members = await this.#repository.getChatMembers(existingChat.id);
      return {
        chat: toChatDetailDto(existingChat, members),
        created: false,
      };
    }

    const chatId = randomUUID();
    const [directUserLow, directUserHigh] = [
      input.currentUserId,
      input.targetUserId,
    ].sort((a, b) => a.localeCompare(b));

    try {
      await this.#repository.createChatWithMembers({
        chatId,
        type: "direct",
        title: directTitle,
        createdBy: input.currentUserId,
        directUserLow,
        directUserHigh,
        members: [
          { userId: input.currentUserId, role: "member" },
          { userId: input.targetUserId, role: "member" },
        ],
      });
    } catch (error) {
      if (!isPgUniqueViolationError(error)) {
        throw error;
      }

      const conflictedChatId = await this.#repository.findExistingDirectChatId(
        input.currentUserId,
        input.targetUserId,
      );
      if (!conflictedChatId) {
        throw error;
      }

      const conflictedChat = await this.#repository.getChatByIdForMember(
        conflictedChatId,
        input.currentUserId,
      );
      if (!conflictedChat) {
        throw new NotFoundError("Chat was not found.");
      }

      const conflictedMembers = await this.#repository.getChatMembers(
        conflictedChat.id,
      );
      return {
        chat: toChatDetailDto(conflictedChat, conflictedMembers),
        created: false,
      };
    }

    const chat = await this.#repository.getChatByIdForMember(chatId, input.currentUserId);
    if (!chat) {
      throw new NotFoundError("Chat was not found.");
    }

    const members = await this.#repository.getChatMembers(chat.id);
    return {
      chat: toChatDetailDto(chat, members),
      created: true,
    };
  }

  async createGroupChat(input: CreateGroupChatInput): Promise<CreateChatResult> {
    const normalizedTitle = input.title.trim();
    if (normalizedTitle.length === 0) {
      throw new BadRequestError("Group title is required.");
    }

    const uniqueParticipantIds = Array.from(
      new Set(
        input.participantUserIds.filter((userId) => userId !== input.currentUserId),
      ),
    );
    if (uniqueParticipantIds.length === 0) {
      throw new BadRequestError(
        "Group chat must include at least one other participant.",
      );
    }

    const existingParticipantIds = await this.#repository.findExistingUserIds(
      uniqueParticipantIds,
    );
    const missingParticipantIds = uniqueParticipantIds.filter(
      (userId) => !existingParticipantIds.includes(userId),
    );

    if (missingParticipantIds.length > 0) {
      throw new BadRequestError("Some participants were not found.", {
        missingParticipantIds,
      });
    }

    const chatId = randomUUID();
    await this.#repository.createChatWithMembers({
      chatId,
      type: "group",
      title: normalizedTitle,
      createdBy: input.currentUserId,
      directUserLow: null,
      directUserHigh: null,
      members: [
        { userId: input.currentUserId, role: "owner" },
        ...uniqueParticipantIds.map((userId) => ({ userId, role: "member" })),
      ],
    });

    const chat = await this.#repository.getChatByIdForMember(chatId, input.currentUserId);
    if (!chat) {
      throw new NotFoundError("Chat was not found.");
    }

    const members = await this.#repository.getChatMembers(chat.id);
    return {
      chat: toChatDetailDto(chat, members),
      created: true,
    };
  }

  async listChats(input: ListChatsInput) {
    const chats = await this.#repository.listChatsForMember(
      input.currentUserId,
      input.limit,
      input.offset,
    );

    return chats.map(toChatSummaryDto);
  }

  async getChatById(input: GetChatByIdInput) {
    const isMember = await this.#repository.isChatMember(input.chatId, input.currentUserId);
    if (!isMember) {
      throw new NotFoundError("Chat was not found.");
    }

    const chat = await this.#repository.getChatByIdForMember(
      input.chatId,
      input.currentUserId,
    );
    if (!chat) {
      throw new NotFoundError("Chat was not found.");
    }

    const members = await this.#repository.getChatMembers(chat.id);
    return toChatDetailDto(chat, members);
  }

  async isUserChatMember(chatId: string, userId: string): Promise<boolean> {
    return this.#repository.isChatMember(chatId, userId);
  }
}
