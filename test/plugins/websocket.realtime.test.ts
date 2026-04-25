import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import type { RawData } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

type RegisteredUser = {
  id: string;
  accessToken: string;
};

type WsEvent = {
  type: string;
  [key: string]: unknown;
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function connectSocket(url: string): Promise<WebSocket> {
  return connectSocketWithToken(url);
}

function connectSocketWithToken(url: string, token?: string): Promise<WebSocket> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    socket.once("open", () => resolve(socket));
    socket.once("error", (error) => reject(error));
  });
}

function waitForSocketClose(
  socket: WebSocket,
  timeoutMs = 2_000,
): Promise<{ code: number; reason: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Socket close timed out."));
    }, timeoutMs);

    socket.once("close", (code, reasonBuffer) => {
      clearTimeout(timer);
      resolve({
        code,
        reason: reasonBuffer.toString("utf8"),
      });
    });
  });
}

function waitForEvent(
  socket: WebSocket,
  matcher: (event: WsEvent) => boolean,
  timeoutMs = 2_000,
): Promise<WsEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for websocket event."));
    }, timeoutMs);

    const onMessage = (rawPayload: RawData) => {
      const decoded = JSON.parse(rawPayload.toString("utf8")) as WsEvent;
      if (!matcher(decoded)) {
        return;
      }

      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(decoded);
    };

    socket.on("message", onMessage);
  });
}

function waitForEventSequence(
  socket: WebSocket,
  matchers: Array<(event: WsEvent) => boolean>,
  timeoutMs = 2_000,
): Promise<WsEvent[]> {
  return new Promise((resolve, reject) => {
    const matched: WsEvent[] = [];
    let matcherIndex = 0;
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for websocket event sequence."));
    }, timeoutMs);

    const onMessage = (rawPayload: RawData) => {
      const decoded = JSON.parse(rawPayload.toString("utf8")) as WsEvent;
      const matcher = matchers[matcherIndex];
      if (!matcher || !matcher(decoded)) {
        return;
      }

      matched.push(decoded);
      matcherIndex += 1;

      if (matcherIndex !== matchers.length) {
        return;
      }

      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(matched);
    };

    socket.on("message", onMessage);
  });
}

async function expectNoMatchingEvent(
  socket: WebSocket,
  matcher: (event: WsEvent) => boolean,
  durationMs: number,
): Promise<void> {
  let matched = false;
  const onMessage = (rawPayload: RawData) => {
    const decoded = JSON.parse(rawPayload.toString("utf8")) as WsEvent;
    if (matcher(decoded)) {
      matched = true;
    }
  };

  socket.on("message", onMessage);
  await sleep(durationMs);
  socket.off("message", onMessage);

  expect(matched).toBe(false);
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

  return response.json().data.id as string;
}

describe("websocket realtime", () => {
  let app: FastifyInstance | undefined;
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    for (const socket of sockets) {
      try {
        socket.terminate();
      } catch {
        // socket might already be closed
      }
    }
    sockets.length = 0;

    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("supports authenticated websocket connect and ping/pong", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_ping_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const socket = await connectSocketWithToken(wsUrl, alice.accessToken);
    sockets.push(socket);

    const correlationId = randomUUID();
    socket.send(
      JSON.stringify({
        type: "client.ping",
        correlationId,
      }),
    );

    const pong = await waitForEvent(
      socket,
      (event) => event.type === "server.pong" && event.correlationId === correlationId,
    );
    expect(pong).toMatchObject({
      type: "server.pong",
      correlationId,
      serverTime: expect.any(String),
    });
  });

  it("returns INVALID_JSON for malformed websocket payload", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_invalid_json_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const socket = await connectSocketWithToken(wsUrl, alice.accessToken);
    sockets.push(socket);

    socket.send("{invalid-json");

    const errorEvent = await waitForEvent(
      socket,
      (event) => event.type === "server.error" && event.code === "INVALID_JSON",
    );
    expect(errorEvent).toMatchObject({
      type: "server.error",
      code: "INVALID_JSON",
    });
  });

  it("rejects unauthorized websocket connection", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const socket = await connectSocket(wsUrl);
    sockets.push(socket);

    const closed = await waitForSocketClose(socket);
    expect(closed.code).toBe(1008);
  });

  it("accepts websocket auth token from query string for browser clients", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_query_alice_ok", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws?access_token=${alice.accessToken}`;

    const socket = await connectSocket(wsUrl);
    sockets.push(socket);

    const correlationId = randomUUID();
    socket.send(
      JSON.stringify({
        type: "client.ping",
        correlationId,
      }),
    );

    const pong = await waitForEvent(
      socket,
      (event) => event.type === "server.pong" && event.correlationId === correlationId,
    );
    expect(pong).toMatchObject({
      type: "server.pong",
      correlationId,
    });
  });

  it("enforces chat membership on websocket chat subscriptions", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_chat_sub_alice", "Alice");
    const bob = await registerUser(currentApp, "ws_chat_sub_bob", "Bob");
    const eve = await registerUser(currentApp, "ws_chat_sub_eve", "Eve");

    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const aliceSocket = await connectSocketWithToken(`${wsBase}/ws`, alice.accessToken);
    sockets.push(aliceSocket);
    aliceSocket.send(
      JSON.stringify({
        type: "chat.subscribe",
        chatId,
      }),
    );
    const aliceSubscribed = await waitForEvent(
      aliceSocket,
      (event) => event.type === "chat.subscribed",
    );
    expect(aliceSubscribed).toMatchObject({
      type: "chat.subscribed",
      chatId,
    });

    const eveSocket = await connectSocketWithToken(`${wsBase}/ws`, eve.accessToken);
    sockets.push(eveSocket);
    eveSocket.send(
      JSON.stringify({
        type: "chat.subscribe",
        chatId,
      }),
    );
    const eveForbidden = await waitForEvent(
      eveSocket,
      (event) => event.type === "server.error",
    );
    expect(eveForbidden).toMatchObject({
      type: "server.error",
      code: "FORBIDDEN",
    });
  });

  it("delivers chat.created to online participants without chat subscription", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_chat_created_alice", "Alice");
    const bob = await registerUser(currentApp, "ws_chat_created_bob", "Bob");
    const eve = await registerUser(currentApp, "ws_chat_created_eve", "Eve");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const bobSocket = await connectSocketWithToken(`${wsBase}/ws`, bob.accessToken);
    const eveSocket = await connectSocketWithToken(`${wsBase}/ws`, eve.accessToken);
    sockets.push(bobSocket, eveSocket);

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
    expect(createResponse.statusCode).toBe(201);

    const createdEvent = await waitForEvent(
      bobSocket,
      (event) => event.type === "chat.created",
    );
    expect(createdEvent).toMatchObject({
      type: "chat.created",
      chat: {
        id: expect.any(String),
        type: "direct",
      },
    });
    const createdChatId = (createdEvent as { chat?: { id?: string } }).chat?.id;
    expect(createdChatId).toEqual(expect.any(String));

    await expectNoMatchingEvent(
      eveSocket,
      (event) =>
        event.type === "chat.created" &&
        typeof event.chat === "object" &&
        event.chat !== null &&
        "id" in event.chat &&
        event.chat.id === createdChatId,
      500,
    );
  });

  it("streams presence updates to watchers", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_presence_alice", "Alice");
    const bob = await registerUser(currentApp, "ws_presence_bob", "Bob");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const aliceSocket = await connectSocketWithToken(`${wsBase}/ws`, alice.accessToken);
    sockets.push(aliceSocket);

    aliceSocket.send(
      JSON.stringify({
        type: "presence.watch",
        userIds: [bob.id],
      }),
    );

    const watched = await waitForEvent(
      aliceSocket,
      (event) => event.type === "presence.watched",
    );
    expect(watched).toMatchObject({
      type: "presence.watched",
      userIds: expect.arrayContaining([alice.id, bob.id]),
    });

    const bobSocket = await connectSocketWithToken(`${wsBase}/ws`, bob.accessToken);
    sockets.push(bobSocket);

    const bobOnline = await waitForEvent(
      aliceSocket,
      (event) =>
        event.type === "presence.updated" &&
        event.userId === bob.id &&
        event.isOnline === true,
    );
    expect(bobOnline).toMatchObject({
      type: "presence.updated",
      userId: bob.id,
      isOnline: true,
    });

    const bobClosed = waitForSocketClose(bobSocket);
    bobSocket.close();
    await bobClosed;

    const bobOffline = await waitForEvent(
      aliceSocket,
      (event) =>
        event.type === "presence.updated" &&
        event.userId === bob.id &&
        event.isOnline === false,
      4_000,
    );
    expect(bobOffline).toMatchObject({
      type: "presence.updated",
      userId: bob.id,
      isOnline: false,
    });
  });

  it("fans out message.created only to authorized subscribed participants", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_msg_alice", "Alice");
    const bob = await registerUser(currentApp, "ws_msg_bob", "Bob");
    const eve = await registerUser(currentApp, "ws_msg_eve", "Eve");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const aliceSocket = await connectSocketWithToken(`${wsBase}/ws`, alice.accessToken);
    const bobSocket = await connectSocketWithToken(`${wsBase}/ws`, bob.accessToken);
    const eveSocket = await connectSocketWithToken(`${wsBase}/ws`, eve.accessToken);
    sockets.push(aliceSocket, bobSocket, eveSocket);

    aliceSocket.send(JSON.stringify({ type: "chat.subscribe", chatId }));
    bobSocket.send(JSON.stringify({ type: "chat.subscribe", chatId }));
    eveSocket.send(JSON.stringify({ type: "chat.subscribe", chatId }));

    await waitForEvent(aliceSocket, (event) => event.type === "chat.subscribed");
    await waitForEvent(bobSocket, (event) => event.type === "chat.subscribed");
    await waitForEvent(
      eveSocket,
      (event) => event.type === "server.error" && event.code === "FORBIDDEN",
    );

    const clientMessageId = randomUUID();
    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId,
        body: "hello via ws",
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const bobMessageEvent = await waitForEvent(
      bobSocket,
      (event) => event.type === "message.created" && event.chatId === chatId,
      4_000,
    );
    expect(bobMessageEvent).toMatchObject({
      type: "message.created",
      chatId,
      message: {
        clientMessageId,
        body: "hello via ws",
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
        body: "hello via ws",
      },
    });
    expect(retryResponse.statusCode).toBe(200);

    await expectNoMatchingEvent(
      bobSocket,
      (event) =>
        event.type === "message.created" &&
        event.chatId === chatId &&
        typeof event.message === "object" &&
        event.message !== null &&
        "clientMessageId" in event.message &&
        event.message.clientMessageId === clientMessageId,
      500,
    );

    await expectNoMatchingEvent(
      eveSocket,
      (event) => event.type === "message.created" && event.chatId === chatId,
      500,
    );
  });

  it("processes chat subscribe and unsubscribe in strict order", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "ws_order_alice", "Alice");
    const bob = await registerUser(currentApp, "ws_order_bob", "Bob");
    const chatId = await createDirectChat(currentApp, alice.accessToken, bob.id);

    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const aliceSocket = await connectSocketWithToken(`${wsBase}/ws`, alice.accessToken);
    const bobSocket = await connectSocketWithToken(`${wsBase}/ws`, bob.accessToken);
    sockets.push(aliceSocket, bobSocket);

    const sequencePromise = waitForEventSequence(
      bobSocket,
      [
        (event) => event.type === "chat.subscribed" && event.chatId === chatId,
        (event) => event.type === "chat.unsubscribed" && event.chatId === chatId,
      ],
      4_000,
    );

    bobSocket.send(JSON.stringify({ type: "chat.subscribe", chatId }));
    bobSocket.send(JSON.stringify({ type: "chat.unsubscribe", chatId }));

    const [subscribed, unsubscribed] = await sequencePromise;
    expect(subscribed).toMatchObject({ type: "chat.subscribed", chatId });
    expect(unsubscribed).toMatchObject({ type: "chat.unsubscribed", chatId });

    const createResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        body: "after unsubscribe",
      },
    });
    expect(createResponse.statusCode).toBe(201);

    await expectNoMatchingEvent(
      bobSocket,
      (event) => event.type === "message.created" && event.chatId === chatId,
      600,
    );
  });
});
