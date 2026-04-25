import { createHash, randomUUID } from "node:crypto";
import type { JWT } from "@fastify/jwt";
import type { TokenPayload } from "./auth.types";

type TokenServiceOptions = {
  readonly jwt: JWT;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
};

const MAX_TOKEN_LENGTH = 4096;

export class AuthTokenService {
  readonly #jwt: JWT;
  readonly #accessTokenTtlSeconds: number;
  readonly #refreshTokenTtlSeconds: number;

  constructor(options: TokenServiceOptions) {
    this.#jwt = options.jwt;
    this.#accessTokenTtlSeconds = options.accessTokenTtlSeconds;
    this.#refreshTokenTtlSeconds = options.refreshTokenTtlSeconds;
  }

  get accessTokenTtlSeconds(): number {
    return this.#accessTokenTtlSeconds;
  }

  get refreshTokenTtlSeconds(): number {
    return this.#refreshTokenTtlSeconds;
  }

  issueAccessToken(userId: string): string {
    return this.#jwt.sign(
      {
        sub: userId,
        tokenType: "access",
      } satisfies TokenPayload,
      {
        expiresIn: this.#accessTokenTtlSeconds,
      },
    );
  }

  issueRefreshToken(userId: string, sessionId: string): string {
    return this.#jwt.sign(
      {
        sub: userId,
        sid: sessionId,
        tokenType: "refresh",
        jti: randomUUID(),
      } satisfies TokenPayload,
      {
        expiresIn: this.#refreshTokenTtlSeconds,
      },
    );
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
      return null;
    }

    try {
      const payload = this.#jwt.verify<TokenPayload>(token);
      if (
        !payload ||
        payload.tokenType !== "refresh" ||
        typeof payload.sub !== "string" ||
        typeof payload.sid !== "string"
      ) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
