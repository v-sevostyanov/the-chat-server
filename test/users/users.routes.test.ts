import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

type RegisteredUser = {
  id: string;
  accessToken: string;
};

async function registerUser(
  app: FastifyInstance,
  username: string,
  displayName: string,
): Promise<RegisteredUser> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      username,
      displayName,
      password: "super-secure-password",
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode}`);
  }

  const body = response.json();
  return {
    id: body.data.user.id,
    accessToken: body.data.tokens.accessToken,
  };
}

describe("users routes", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns current user profile for authenticated request", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_me_alice", "Alice");

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: alice.id,
        username: "users_me_alice",
        displayName: "Alice",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(response.json().data.passwordHash).toBeUndefined();
    expect(response.json().data.refreshTokenHash).toBeUndefined();
  });

  it("rejects current user profile request without auth", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("updates current user profile with valid payload", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_update_alice", "Alice");

    const updateResponse = await currentApp.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        username: "Users_Update_Alice_New",
        displayName: "Alice Cooper",
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      data: {
        id: alice.id,
        username: "users_update_alice_new",
        displayName: "Alice Cooper",
      },
    });
  });

  it("rejects invalid profile update payload", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_invalid_alice", "Alice");

    const response = await currentApp.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("enforces self-update ownership semantics (only current user profile is updated)", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_owner_alice", "Alice");
    const bob = await registerUser(currentApp, "users_owner_bob", "Bob");

    await currentApp.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        displayName: "Alice Updated",
      },
    });

    const bobProfileResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/users/${bob.id}`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(bobProfileResponse.statusCode).toBe(200);
    expect(bobProfileResponse.json()).toMatchObject({
      data: {
        id: bob.id,
        displayName: "Bob",
      },
    });
  });

  it("returns user by id for authenticated request", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_by_id_alice", "Alice");
    const bob = await registerUser(currentApp, "users_by_id_bob", "Bob");

    const response = await currentApp.inject({
      method: "GET",
      url: `/api/v1/users/${bob.id}`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: bob.id,
        username: "users_by_id_bob",
        displayName: "Bob",
      },
    });
    expect(response.json().data.passwordHash).toBeUndefined();
  });

  it("returns not found for missing user id", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_missing_alice", "Alice");

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/users/3f64f061-f9bb-4f89-aa1d-9e074bb9efea",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
      },
    });
  });

  it("lists users for lookup with pagination and search", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "users_list_alice", "Alice");
    await registerUser(currentApp, "users_list_bob", "Bob");
    await registerUser(currentApp, "users_list_charlie", "Charlie");

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/users?search=bo&limit=10&offset=0",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      username: "users_list_bob",
      displayName: "Bob",
    });
  });
});
