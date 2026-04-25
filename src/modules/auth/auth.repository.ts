import { and, eq, gt, isNull } from "drizzle-orm";
import type { AppDb } from "../../db/client";
import { authRefreshSessions, userCredentials, users } from "../../db/schema";

type CreateUserWithCredentialInput = {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
};

type CreateRefreshSessionInput = {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

type RotateRefreshSessionInput = {
  sessionId: string;
  currentRefreshTokenHash: string;
  nextRefreshTokenHash: string;
  nextExpiresAt: Date;
  now: Date;
};

export class AuthRepository {
  readonly #db: AppDb;

  constructor(db: AppDb) {
    this.#db = db;
  }

  async findUserById(userId: string) {
    const [row] = await this.#db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async findUserByUsername(username: string) {
    const [row] = await this.#db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return row ?? null;
  }

  async findUserWithCredentialsByUsername(username: string) {
    const [row] = await this.#db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        passwordHash: userCredentials.passwordHash,
      })
      .from(users)
      .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(eq(users.username, username))
      .limit(1);

    return row ?? null;
  }

  async createUserWithCredentials(input: CreateUserWithCredentialInput) {
    return this.#db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id: input.userId,
          username: input.username,
          displayName: input.displayName,
        })
        .returning({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        });

      await tx.insert(userCredentials).values({
        userId: input.userId,
        passwordHash: input.passwordHash,
      });

      return user;
    });
  }

  async createRefreshSession(input: CreateRefreshSessionInput): Promise<void> {
    await this.#db.insert(authRefreshSessions).values({
      id: input.sessionId,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
    });
  }

  async findActiveRefreshSession(sessionId: string, now: Date) {
    const [row] = await this.#db
      .select({
        id: authRefreshSessions.id,
        userId: authRefreshSessions.userId,
        refreshTokenHash: authRefreshSessions.refreshTokenHash,
        expiresAt: authRefreshSessions.expiresAt,
        revokedAt: authRefreshSessions.revokedAt,
      })
      .from(authRefreshSessions)
      .where(
        and(
          eq(authRefreshSessions.id, sessionId),
          isNull(authRefreshSessions.revokedAt),
          gt(authRefreshSessions.expiresAt, now),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async rotateRefreshSession(input: RotateRefreshSessionInput): Promise<boolean> {
    const updatedRows = await this.#db
      .update(authRefreshSessions)
      .set({
        refreshTokenHash: input.nextRefreshTokenHash,
        expiresAt: input.nextExpiresAt,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(authRefreshSessions.id, input.sessionId),
          eq(authRefreshSessions.refreshTokenHash, input.currentRefreshTokenHash),
          isNull(authRefreshSessions.revokedAt),
          gt(authRefreshSessions.expiresAt, input.now),
        ),
      )
      .returning({ id: authRefreshSessions.id });

    return updatedRows.length === 1;
  }

  async revokeRefreshSession(sessionId: string, now: Date): Promise<void> {
    await this.#db
      .update(authRefreshSessions)
      .set({
        revokedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(authRefreshSessions.id, sessionId),
          isNull(authRefreshSessions.revokedAt),
        ),
      );
  }
}
