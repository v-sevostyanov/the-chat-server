import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

describe("auth routes", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("registers a user and returns auth tokens", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "Alice_1",
        displayName: "Alice",
        password: "super-secure-password",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.user).toMatchObject({
      username: "alice_1",
      displayName: "Alice",
    });
    expect(body.data.user.id).toEqual(expect.any(String));
    expect(body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(body.data.tokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects invalid registration payload", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "ab",
        displayName: "",
        password: "123",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: {
          validation: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              message: expect.any(String),
            }),
          ]),
        },
      },
    });
    expect(JSON.stringify(body.error.details)).not.toContain("schemaPath");
    expect(JSON.stringify(body.error.details)).not.toContain("keyword");
    expect(JSON.stringify(body.error.details)).not.toContain("params");
  });

  it("rejects duplicate registration", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "duplicate",
        displayName: "One",
        password: "super-secure-password",
      },
    });

    const duplicateResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "duplicate",
        displayName: "Two",
        password: "super-secure-password",
      },
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({
      error: {
        code: "CONFLICT",
      },
    });
  });

  it("logs in with valid credentials", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "login_user",
        displayName: "Login User",
        password: "super-secure-password",
      },
    });

    const loginResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        username: "login_user",
        password: "super-secure-password",
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toMatchObject({
      data: {
        user: {
          username: "login_user",
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      },
    });
  });

  it("rejects invalid credentials", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "invalid_login",
        displayName: "Invalid Login",
        password: "super-secure-password",
      },
    });

    const loginResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        username: "invalid_login",
        password: "wrong-password",
      },
    });

    expect(loginResponse.statusCode).toBe(401);
    expect(loginResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("returns current user for authenticated request", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const registerResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "me_user",
        displayName: "Me User",
        password: "super-secure-password",
      },
    });

    const accessToken = registerResponse.json().data.tokens.accessToken as string;

    const meResponse = await currentApp.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      data: {
        username: "me_user",
      },
    });
  });

  it("rejects current user request without access token", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const meResponse = await currentApp.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(meResponse.statusCode).toBe(401);
    expect(meResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("does not leak auth internals in unauthorized response", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const meResponse = await currentApp.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: "Bearer invalid.token.value",
      },
    });

    expect(meResponse.statusCode).toBe(401);
    expect(meResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing auth token.",
      },
    });
    expect(meResponse.json().error.details).toBeUndefined();
  });

  it("rejects access tokens without a valid uuid subject on protected HTTP routes", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const malformedPayloads: Array<Record<string, unknown>> = [
      { tokenType: "access" },
      { tokenType: "access", sub: "" },
      { tokenType: "access", sub: "not-a-uuid" },
    ];
    for (const payload of malformedPayloads) {
      const token = currentApp.jwt.sign(payload as never);
      const responses = [
        await currentApp.inject({
          method: "GET",
          url: "/api/v1/users",
          headers: {
            authorization: `Bearer ${token}`,
          },
        }),
        await currentApp.inject({
          method: "GET",
          url: "/api/v1/users/me",
          headers: {
            authorization: `Bearer ${token}`,
          },
        }),
        await currentApp.inject({
          method: "POST",
          url: "/api/v1/messages",
          headers: {
            authorization: `Bearer ${token}`,
          },
          payload: {
            chatId: randomUUID(),
            body: "unauthorized",
          },
        }),
      ];

      for (const response of responses) {
        expect(response.statusCode).toBe(401);
        expect(response.json()).toMatchObject({
          error: {
            code: "UNAUTHORIZED",
          },
        });
      }
    }
  });

  it("refreshes token pair with valid refresh token", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const registerResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "refresh_user",
        displayName: "Refresh User",
        password: "super-secure-password",
      },
    });

    const originalTokens = registerResponse.json().data.tokens;

    const refreshResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken: originalTokens.refreshToken,
      },
    });

    expect(refreshResponse.statusCode).toBe(200);
    const refreshedTokens = refreshResponse.json().data.tokens;
    expect(refreshedTokens.accessToken).toEqual(expect.any(String));
    expect(refreshedTokens.refreshToken).toEqual(expect.any(String));
    expect(refreshedTokens.refreshToken).not.toBe(originalTokens.refreshToken);
  });

  it("rejects invalid refresh token", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const refreshResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken: "invalid-token",
      },
    });

    expect(refreshResponse.statusCode).toBe(401);
    expect(refreshResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("rejects refresh token payload that exceeds max length", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const refreshResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken: "a".repeat(4097),
      },
    });

    expect(refreshResponse.statusCode).toBe(400);
    expect(refreshResponse.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("logs out and revokes refresh session", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const registerResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "logout_user",
        displayName: "Logout User",
        password: "super-secure-password",
      },
    });

    const refreshToken = registerResponse.json().data.tokens.refreshToken as string;

    const logoutResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: {
        refreshToken,
      },
    });

    expect(logoutResponse.statusCode).toBe(204);
  });

  it("rejects refresh after logout", async () => {
    const setup = await createTestApp();
    const currentApp = setup.app;
    app = currentApp;

    const registerResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        username: "logout_refresh_user",
        displayName: "Logout Refresh User",
        password: "super-secure-password",
      },
    });

    const refreshToken = registerResponse.json().data.tokens.refreshToken as string;

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: {
        refreshToken,
      },
    });

    const refreshResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken,
      },
    });

    expect(refreshResponse.statusCode).toBe(401);
    expect(refreshResponse.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });
});
