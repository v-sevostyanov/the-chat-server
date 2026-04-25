import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

type RegisteredUser = {
  id: string;
  accessToken: string;
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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

async function createDirectChat(
  app: FastifyInstance,
  initiatorToken: string,
  targetUserId: string,
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/chats/direct",
    headers: {
      authorization: `Bearer ${initiatorToken}`,
    },
    payload: {
      targetUserId,
    },
  });

  if (![200, 201].includes(response.statusCode)) {
    throw new Error(`Failed to create direct chat: ${response.statusCode}`);
  }

  return response.json().data.id;
}

describe("messages routes", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("creates a message in a chat for an authorized member", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_create", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_create", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body: "Hello from Alice",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        chatId,
        body: "Hello from Alice",
        sender: {
          id: alice.id,
          username: "alice_msg_create",
        },
      },
    });
  });

  it("preserves Cyrillic message text through create and list flows", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_cyrillic", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_cyrillic", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);
    const body = "Привет, мир";

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      data: {
        chatId,
        body,
        sender: {
          id: alice.id,
          username: "alice_msg_cyrillic",
        },
      },
    });

    const listResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}`,
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chatId,
          body,
        }),
      ]),
    );
  });

  it("returns the existing message for a repeated clientMessageId", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_idempotent", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_idempotent", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);
    const clientMessageId = randomUUID();

    const firstResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId,
        body: "idempotent hello",
      },
    });

    const retryResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId,
        body: "idempotent hello",
      },
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(retryResponse.statusCode).toBe(200);
    expect(retryResponse.json()).toMatchObject({
      data: {
        id: firstResponse.json().data.id,
        clientMessageId,
        body: "idempotent hello",
      },
    });

    const listResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}`,
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const matchingMessages = listResponse
      .json()
      .data.filter(
        (message: { clientMessageId: string | null }) =>
          message.clientMessageId === clientMessageId,
      );
    expect(matchingMessages).toHaveLength(1);
  });

  it("rejects a repeated clientMessageId with a different message body", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(
      currentApp,
      "alice_msg_idempotent_conflict",
      "Alice",
    );
    const bob = await registerUser(
      currentApp,
      "bob_msg_idempotent_conflict",
      "Bob",
    );
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);
    const clientMessageId = randomUUID();

    const firstResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId,
        body: "original body",
      },
    });

    const retryResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId,
        body: "changed body",
      },
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(retryResponse.statusCode).toBe(409);
    expect(retryResponse.json()).toMatchObject({
      error: {
        code: "CONFLICT",
      },
    });

    const listResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}`,
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const matchingMessages = listResponse
      .json()
      .data.filter(
        (message: { clientMessageId: string | null }) =>
          message.clientMessageId === clientMessageId,
      );
    expect(matchingMessages).toHaveLength(1);
    expect(matchingMessages[0]).toMatchObject({
      body: "original body",
    });
  });

  it("rejects invalid create message payload", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_invalid", "Alice");

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId: "not-a-uuid",
        body: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("rejects create message for non-member", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_member", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_member", "Bob");
    const eve = await registerUser(currentApp, "eve_msg_member", "Eve");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${eve.accessToken}`,
      },
      payload: {
        chatId,
        body: "I should not post here",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("lists chat messages for an authorized member", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_list", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_list", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body: "first",
      },
    });

    await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
      payload: {
        chatId,
        body: "second",
      },
    });

    const response = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        expect.objectContaining({ chatId }),
        expect.objectContaining({ chatId }),
      ],
      page: {
        limit: 50,
      },
    });
  });

  it("rejects list chat messages for unauthorized user", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_list_forbidden", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_list_forbidden", "Bob");
    const eve = await registerUser(currentApp, "eve_msg_list_forbidden", "Eve");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const response = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}`,
      headers: {
        authorization: `Bearer ${eve.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns message by id for an authorized participant", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_get", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_get", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body: "single message",
      },
    });

    const messageId = createResponse.json().data.id as string;

    const getResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/${messageId}`,
      headers: {
        authorization: `Bearer ${bob.accessToken}`,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      data: {
        id: messageId,
        chatId,
      },
    });
  });

  it("rejects message by id for unauthorized user", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_get_forbidden", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_get_forbidden", "Bob");
    const eve = await registerUser(currentApp, "eve_msg_get_forbidden", "Eve");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body: "private message",
      },
    });

    const messageId = createResponse.json().data.id as string;

    const getResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/${messageId}`,
      headers: {
        authorization: `Bearer ${eve.accessToken}`,
      },
    });

    expect(getResponse.statusCode).toBe(404);
  });

  it("rejects unauthenticated access to protected messages routes", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const response = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      payload: {
        chatId: "7f95da67-b987-4f88-9517-5ef0f8127c9f",
        body: "unauthenticated",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("supports deterministic ordering and cursor pagination for chat history", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "alice_msg_cursor", "Alice");
    const bob = await registerUser(currentApp, "bob_msg_cursor", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const bodies = ["message-1", "message-2", "message-3"];
    for (const body of bodies) {
      await currentApp.inject({
        method: "POST",
        url: "/api/v1/messages",
        headers: {
          authorization: `Bearer ${alice.accessToken}`,
        },
        payload: {
          chatId,
          body,
        },
      });
      await sleep(5);
    }

    const firstPageResponse = await currentApp.inject({
      method: "GET",
      url: `/api/v1/messages/chat/${chatId}?limit=2`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(firstPageResponse.statusCode).toBe(200);
    const firstPage = firstPageResponse.json();
    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.page.nextCursor).toEqual(
      expect.objectContaining({
        beforeCreatedAt: expect.any(String),
        beforeMessageId: expect.any(String),
      }),
    );

    const cursor = firstPage.page.nextCursor as {
      beforeCreatedAt: string;
      beforeMessageId: string;
    };

    const secondPageResponse = await currentApp.inject({
      method: "GET",
      url:
        `/api/v1/messages/chat/${chatId}?limit=2&beforeCreatedAt=${encodeURIComponent(cursor.beforeCreatedAt)}&beforeMessageId=${cursor.beforeMessageId}`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(secondPageResponse.statusCode).toBe(200);
    const secondPage = secondPageResponse.json();
    expect(secondPage.data).toHaveLength(1);

    const firstPageCreated = firstPage.data.map(
      (message: { createdAt: string; id: string }) =>
        `${message.createdAt}|${message.id}`,
    );
    const sortedFirstPage = [...firstPageCreated].sort().reverse();
    expect(firstPageCreated).toEqual(sortedFirstPage);
  });
});
