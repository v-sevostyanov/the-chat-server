import { randomUUID } from "node:crypto";
import { ConflictError, UnauthorizedError } from "../../shared/errors/app-error";
import { isPgUniqueViolationError } from "../../shared/db/errors";
import { toAuthUserDto } from "./auth.mapper";
import { hashPassword, verifyPassword } from "./auth.password";
import { AuthRepository } from "./auth.repository";
import { AuthTokenService } from "./auth.tokens";
import type {
  AuthResponseDto,
  AuthUserDto,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
} from "./auth.types";

export class AuthService {
  readonly #repository: AuthRepository;
  readonly #tokens: AuthTokenService;

  constructor(repository: AuthRepository, tokens: AuthTokenService) {
    this.#repository = repository;
    this.#tokens = tokens;
  }

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const username = input.username.trim().toLowerCase();
    const displayName = input.displayName.trim();

    const existingUser = await this.#repository.findUserByUsername(username);
    if (existingUser) {
      throw new ConflictError("Username already exists.", {
        username,
      });
    }

    const passwordHash = await hashPassword(input.password);
    const userId = randomUUID();
    let user;
    try {
      user = await this.#repository.createUserWithCredentials({
        userId,
        username,
        displayName,
        passwordHash,
      });
    } catch (error) {
      if (isPgUniqueViolationError(error)) {
        throw new ConflictError("Username already exists.", {
          username,
        });
      }

      throw error;
    }

    return this.#issueAuthResponse(toAuthUserDto(user));
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const username = input.username.trim().toLowerCase();
    const user = await this.#repository.findUserWithCredentialsByUsername(username);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials.");
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError("Invalid credentials.");
    }

    return this.#issueAuthResponse(
      toAuthUserDto({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      }),
    );
  }

  async getSessionUser(userId: string): Promise<AuthUserDto> {
    const user = await this.#repository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError("Invalid or missing auth token.");
    }

    return toAuthUserDto(user);
  }

  async refresh(input: RefreshInput): Promise<AuthResponseDto> {
    const tokenPayload = this.#tokens.verifyRefreshToken(input.refreshToken);
    if (!tokenPayload || !tokenPayload.sid) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const now = new Date();
    const refreshSession = await this.#repository.findActiveRefreshSession(
      tokenPayload.sid,
      now,
    );

    if (!refreshSession) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const currentTokenHash = this.#tokens.hashRefreshToken(input.refreshToken);
    if (currentTokenHash !== refreshSession.refreshTokenHash) {
      await this.#repository.revokeRefreshSession(refreshSession.id, now);
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const user = await this.#repository.findUserById(refreshSession.userId);
    if (!user) {
      await this.#repository.revokeRefreshSession(refreshSession.id, now);
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const nextRefreshToken = this.#tokens.issueRefreshToken(
      refreshSession.userId,
      refreshSession.id,
    );
    const nextRefreshTokenHash = this.#tokens.hashRefreshToken(nextRefreshToken);
    const nextRefreshExpiresAt = new Date(
      now.getTime() + this.#tokens.refreshTokenTtlSeconds * 1000,
    );

    const rotated = await this.#repository.rotateRefreshSession({
      sessionId: refreshSession.id,
      currentRefreshTokenHash: refreshSession.refreshTokenHash,
      nextRefreshTokenHash,
      nextExpiresAt: nextRefreshExpiresAt,
      now,
    });

    if (!rotated) {
      await this.#repository.revokeRefreshSession(refreshSession.id, now);
      throw new UnauthorizedError("Invalid refresh token.");
    }

    return {
      user: toAuthUserDto(user),
      tokens: {
        accessToken: this.#tokens.issueAccessToken(user.id),
        refreshToken: nextRefreshToken,
        accessTokenExpiresIn: this.#tokens.accessTokenTtlSeconds,
        refreshTokenExpiresIn: this.#tokens.refreshTokenTtlSeconds,
      },
    };
  }

  async logout(input: LogoutInput): Promise<void> {
    const tokenPayload = this.#tokens.verifyRefreshToken(input.refreshToken);
    if (!tokenPayload || !tokenPayload.sid) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    await this.#repository.revokeRefreshSession(tokenPayload.sid, new Date());
  }

  async #issueAuthResponse(user: AuthUserDto): Promise<AuthResponseDto> {
    const now = new Date();
    const sessionId = randomUUID();
    const refreshToken = this.#tokens.issueRefreshToken(user.id, sessionId);
    const refreshTokenHash = this.#tokens.hashRefreshToken(refreshToken);
    const refreshExpiresAt = new Date(
      now.getTime() + this.#tokens.refreshTokenTtlSeconds * 1000,
    );

    await this.#repository.createRefreshSession({
      sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt: refreshExpiresAt,
    });

    return {
      user,
      tokens: {
        accessToken: this.#tokens.issueAccessToken(user.id),
        refreshToken,
        accessTokenExpiresIn: this.#tokens.accessTokenTtlSeconds,
        refreshTokenExpiresIn: this.#tokens.refreshTokenTtlSeconds,
      },
    };
  }
}
