import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/modules/auth/auth.repository";
import { AuthService } from "../../src/modules/auth/auth.service";
import type { AuthTokenService } from "../../src/modules/auth/auth.tokens";

describe("AuthService", () => {
  it("revokes refresh session when rotation loses a concurrent update", async () => {
    const sessionId = "b2d219cc-79e0-459a-9912-9af6ad2e2851";
    const userId = "0d98d28b-95c0-4907-9c27-9793df37d091";
    const repository = {
      findActiveRefreshSession: vi.fn().mockResolvedValue({
        id: sessionId,
        userId,
        refreshTokenHash: "current-hash",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      }),
      findUserById: vi.fn().mockResolvedValue({
        id: userId,
        username: "race_user",
        displayName: "Race User",
      }),
      rotateRefreshSession: vi.fn().mockResolvedValue(false),
      revokeRefreshSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthRepository;
    const tokens = {
      get accessTokenTtlSeconds() {
        return 900;
      },
      get refreshTokenTtlSeconds() {
        return 2_592_000;
      },
      verifyRefreshToken: vi.fn().mockReturnValue({
        sub: userId,
        sid: sessionId,
        tokenType: "refresh",
      }),
      hashRefreshToken: vi.fn((token: string) =>
        token === "old-refresh-token" ? "current-hash" : "next-hash",
      ),
      issueRefreshToken: vi.fn().mockReturnValue("next-refresh-token"),
      issueAccessToken: vi.fn().mockReturnValue("next-access-token"),
    } as unknown as AuthTokenService;
    const service = new AuthService(repository, tokens);

    await expect(
      service.refresh({
        refreshToken: "old-refresh-token",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    expect(repository.revokeRefreshSession).toHaveBeenCalledWith(
      sessionId,
      expect.any(Date),
    );
  });
});
