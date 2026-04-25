import { asc, eq, ilike, or } from "drizzle-orm";
import type { AppDb } from "../../db/client";
import { users } from "../../db/schema";
import type { UpdateUserRecord } from "./users.types";

type ListUsersQuery = {
  limit: number;
  offset: number;
  search?: string;
};

export class UsersRepository {
  readonly #db: AppDb;

  constructor(db: AppDb) {
    this.#db = db;
  }

  async findById(userId: string) {
    const [row] = await this.#db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async findByUsername(username: string) {
    const [row] = await this.#db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return row ?? null;
  }

  async updateById(userId: string, patch: UpdateUserRecord, now: Date) {
    const [row] = await this.#db
      .update(users)
      .set({
        ...(patch.username !== undefined ? { username: patch.username } : {}),
        ...(patch.displayName !== undefined
          ? { displayName: patch.displayName }
          : {}),
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();

    return row ?? null;
  }

  async list(query: ListUsersQuery) {
    const whereClause = query.search
      ? or(
          ilike(users.username, `%${query.search}%`),
          ilike(users.displayName, `%${query.search}%`),
        )
      : undefined;

    return this.#db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(query.limit)
      .offset(query.offset);
  }
}
