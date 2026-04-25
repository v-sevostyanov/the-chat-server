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

describe("chats routes", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("creates direct chat between two users", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_direct", "Alice");
    const bob = await registerUser(currentApp, "bob_direct", "Bob");

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data).toMatchObject({
      type: "direct",
      membersCount: 2,
    });
    const memberIds = body.data.members
      .map((member: { userId: string }) => member.userId)
      .sort((a: string, b: string) => a.localeCompare(b));
    expect(memberIds).toEqual([alice.id, bob.id].sort((a, b) => a.localeCompare(b)));
  });

  it("creates direct chat with optional title", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_direct_title", "Alice");
    const bob = await registerUser(currentApp, "bob_direct_title", "Bob");

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
        title: "Project chat",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        type: "direct",
        title: "Project chat",
      },
    });
  });

  it("rejects invalid direct chat target and self-chat", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_target", "Alice");

    const selfChatResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: alice.id,
      },
    });

    expect(selfChatResponse.statusCode).toBe(400);

    const missingTargetResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: "3f64f061-f9bb-4f89-aa1d-9e074bb9efea",
      },
    });

    expect(missingTargetResponse.statusCode).toBe(404);
  });

  it("returns existing direct chat for same pair", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_dup", "Alice");
    const bob = await registerUser(currentApp, "bob_dup", "Bob");

    const firstResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    const secondResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json().data.id).toBe(firstResponse.json().data.id);
  });

  it("creates group chat with participants", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_group", "Alice");
    const bob = await registerUser(currentApp, "bob_group", "Bob");
    const carol = await registerUser(currentApp, "carol_group", "Carol");

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "Backend Team",
        participantUserIds: [bob.id, carol.id],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        type: "group",
        title: "Backend Team",
        membersCount: 3,
      },
    });
  });

  it("rejects invalid group payload", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_invalid_group", "Alice");

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("rejects group chat without other participants", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_empty_group", "Alice");

    const missingParticipantsResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "No participants",
      },
    });

    expect(missingParticipantsResponse.statusCode).toBe(400);
    expect(missingParticipantsResponse.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });

    const emptyParticipantsResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "Empty participants",
        participantUserIds: [],
      },
    });

    expect(emptyParticipantsResponse.statusCode).toBe(400);
    expect(emptyParticipantsResponse.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });

    const selfOnlyResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "Self only",
        participantUserIds: [alice.id],
      },
    });

    expect(selfOnlyResponse.statusCode).toBe(400);
    expect(selfOnlyResponse.json()).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        message: "Group chat must include at least one other participant.",
      },
    });
  });

  it("lists current user chats", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_list", "Alice");
    const bob = await registerUser(currentApp, "bob_list", "Bob");
    const carol = await registerUser(currentApp, "carol_list", "Carol");

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/group",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        title: "List Group",
        participantUserIds: [carol.id],
      },
    });

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/chats",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(2);
    expect(response.json().data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.stringMatching(/^(direct|group)$/),
      }),
    );
  });

  it("returns chat by id for authorized member", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_get", "Alice");
    const bob = await registerUser(currentApp, "bob_get", "Bob");

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    const chatId = createResponse.json().data.id as string;

    const getResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/chats/${chatId}`,
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      data: {
        id: chatId,
        membersCount: 2,
      },
    });
  });

  it("rejects chat by id for unauthorized user", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_forbidden", "Alice");
    const bob = await registerUser(currentApp, "bob_forbidden", "Bob");
    const eve = await registerUser(currentApp, "eve_forbidden", "Eve");

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });

    const chatId = createResponse.json().data.id as string;

    const response = await currentApp.inject({
      method: "GET",
      url: `/api/v1/chats/${chatId}`,
      headers: {
        authorization: `Bearer ${eve.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("rejects unauthenticated access to chats routes", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/chats",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });
});
