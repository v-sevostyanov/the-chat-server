import { and, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "../../db/client";
import { chatMembers, chats, users } from "../../db/schema";

type InsertChatInput = {
  chatId: string;
  type: "direct" | "group";
  title: string | null;
  createdBy: string;
  directUserLow: string | null;
  directUserHigh: string | null;
  members: Array<{
    userId: string;
    role: string;
  }>;
};

type ChatProjection = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  createdBy: string | null;
  createdAt: Date;
  membersCount: number;
};

type ChatMemberProjection = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  joinedAt: Date;
};

export class ChatsRepository {
  readonly #db: AppDb;

  constructor(db: AppDb) {
    this.#db = db;
  }

  async userExists(userId: string): Promise<boolean> {
    const [row] = await this.#db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return Boolean(row);
  }

  async findExistingDirectChatId(userA: string, userB: string): Promise<string | null> {
    const [lowUserId, highUserId] = [userA, userB].sort((a, b) =>
      a.localeCompare(b),
    );

    const [row] = await this.#db
      .select({ id: chats.id })
      .from(chats)
      .where(
        and(
          eq(chats.type, "direct"),
          eq(chats.directUserLow, lowUserId),
          eq(chats.directUserHigh, highUserId),
        ),
      )
      .orderBy(chats.createdAt, chats.id)
      .limit(1);

    if (row?.id) {
      return row.id;
    }

    return null;
  }

  async createChatWithMembers(input: InsertChatInput): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx.insert(chats).values({
        id: input.chatId,
        type: input.type,
        title: input.title,
        createdBy: input.createdBy,
        directUserLow: input.directUserLow,
        directUserHigh: input.directUserHigh,
      });

      await tx.insert(chatMembers).values(
        input.members.map((member) => ({
          chatId: input.chatId,
          userId: member.userId,
          role: member.role,
        })),
      );
    });
  }

  async findExistingUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.#db
      .select({
        id: users.id,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    return rows.map((row) => row.id);
  }

  async getChatByIdForMember(chatId: string, userId: string): Promise<ChatProjection | null> {
    const result = await this.#db.execute<ChatProjection>(sql`
      select
        c.id,
        c.type,
        c.title,
        c.created_by as "createdBy",
        c.created_at as "createdAt",
        count(cm_count.user_id)::int as "membersCount"
      from chats c
      inner join chat_members cm_auth
        on cm_auth.chat_id = c.id and cm_auth.user_id = ${userId}
      inner join chat_members cm_count
        on cm_count.chat_id = c.id
      where c.id = ${chatId}
      group by c.id, c.type, c.title, c.created_by, c.created_at
      limit 1
    `);

    return result.rows[0] ?? null;
  }

  async listChatsForMember(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ChatProjection[]> {
    const result = await this.#db.execute<ChatProjection>(sql`
      select
        c.id,
        c.type,
        c.title,
        c.created_by as "createdBy",
        c.created_at as "createdAt",
        count(cm_count.user_id)::int as "membersCount"
      from chats c
      inner join chat_members cm_auth
        on cm_auth.chat_id = c.id and cm_auth.user_id = ${userId}
      inner join chat_members cm_count
        on cm_count.chat_id = c.id
      group by c.id, c.type, c.title, c.created_by, c.created_at
      order by c.created_at desc, c.id desc
      limit ${limit}
      offset ${offset}
    `);

    return result.rows;
  }

  async getChatMembers(chatId: string): Promise<ChatMemberProjection[]> {
    return this.#db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        role: chatMembers.role,
        joinedAt: chatMembers.joinedAt,
      })
      .from(chatMembers)
      .innerJoin(users, eq(users.id, chatMembers.userId))
      .where(eq(chatMembers.chatId, chatId))
      .orderBy(chatMembers.joinedAt, users.id);
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
}
