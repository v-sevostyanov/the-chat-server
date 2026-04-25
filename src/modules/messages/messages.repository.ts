import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import type { AppDb } from "../../db/client";
import { chatMembers, messages, users } from "../../db/schema";
import { isPgUniqueViolationError } from "../../shared/db/errors";

type CreateMessageRecord = {
  id: string;
  chatId: string;
  senderId: string;
  clientMessageId?: string;
  body: string;
};

type CreateMessageForMemberResult = {
  id: string;
} & (
  | {
      created: true;
    }
  | {
      created: false;
      body: string;
    }
);

type ListChatMessagesQuery = {
  chatId: string;
  userId: string;
  limit: number;
  beforeCreatedAt?: Date;
  beforeMessageId?: string;
};

type MessageProjection = {
  id: string;
  chatId: string;
  clientMessageId: string | null;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
};

export class MessagesRepository {
  readonly #db: AppDb;

  constructor(db: AppDb) {
    this.#db = db;
  }

  async isChatMember(chatId: string, userId: string): Promise<boolean> {
    const [row] = await this.#db
      .select({
        chatId: chatMembers.chatId,
      })
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
      .limit(1);

    return Boolean(row);
  }

  async createMessageForMember(
    input: CreateMessageRecord,
  ): Promise<CreateMessageForMemberResult | null> {
    if (input.clientMessageId) {
      try {
        const result = await this.#db.execute<{ id: string }>(sql`
          insert into messages (id, chat_id, sender_id, client_message_id, body)
          select
            ${input.id},
            ${input.chatId},
            ${input.senderId},
            ${input.clientMessageId},
            ${input.body}
          where exists (
            select 1
            from chat_members cm
            where cm.chat_id = ${input.chatId}
              and cm.user_id = ${input.senderId}
          )
          returning id
        `);

        const insertedId = result.rows[0]?.id;
        if (!insertedId) {
          return null;
        }

        return {
          id: insertedId,
          created: true,
        };
      } catch (error) {
        if (!isPgUniqueViolationError(error)) {
          throw error;
        }
      }

      const [existing] = await this.#db
        .select({
          id: messages.id,
          body: messages.body,
        })
        .from(messages)
        .innerJoin(
          chatMembers,
          and(
            eq(chatMembers.chatId, messages.chatId),
            eq(chatMembers.userId, input.senderId),
          ),
        )
        .where(
          and(
            eq(messages.chatId, input.chatId),
            eq(messages.senderId, input.senderId),
            eq(messages.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1);

      return existing
        ? {
            id: existing.id,
            created: false,
            body: existing.body,
          }
        : null;
    }

    const result = await this.#db.execute<{ id: string }>(sql`
      insert into messages (id, chat_id, sender_id, body)
      select ${input.id}, ${input.chatId}, ${input.senderId}, ${input.body}
      where exists (
        select 1
        from chat_members cm
        where cm.chat_id = ${input.chatId}
          and cm.user_id = ${input.senderId}
      )
      returning id
    `);

    const insertedId = result.rows[0]?.id;
    return insertedId
      ? {
          id: insertedId,
          created: true,
        }
      : null;
  }

  async getMessageByIdForUser(
    messageId: string,
    userId: string,
  ): Promise<MessageProjection | null> {
    const [row] = await this.#db
      .select({
        id: messages.id,
        chatId: messages.chatId,
        clientMessageId: messages.clientMessageId,
        senderId: messages.senderId,
        senderUsername: users.username,
        senderDisplayName: users.displayName,
        body: messages.body,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(
        chatMembers,
        and(eq(chatMembers.chatId, messages.chatId), eq(chatMembers.userId, userId)),
      )
      .where(eq(messages.id, messageId))
      .limit(1);

    return row ?? null;
  }

  async listChatMessagesForUser(query: ListChatMessagesQuery): Promise<MessageProjection[]> {
    const whereClauses = [eq(messages.chatId, query.chatId)];

    if (query.beforeCreatedAt && query.beforeMessageId) {
      whereClauses.push(
        or(
          lt(messages.createdAt, query.beforeCreatedAt),
          and(
            eq(messages.createdAt, query.beforeCreatedAt),
            lt(messages.id, query.beforeMessageId),
          ),
        )!,
      );
    }

    return this.#db
      .select({
        id: messages.id,
        chatId: messages.chatId,
        clientMessageId: messages.clientMessageId,
        senderId: messages.senderId,
        senderUsername: users.username,
        senderDisplayName: users.displayName,
        body: messages.body,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(
        chatMembers,
        and(
          eq(chatMembers.chatId, messages.chatId),
          eq(chatMembers.userId, query.userId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(query.limit);
  }

  async listChatMemberUserIds(chatId: string): Promise<string[]> {
    const rows = await this.#db
      .select({
        userId: chatMembers.userId,
      })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chatId));

    return rows.map((row) => row.userId);
  }
}
