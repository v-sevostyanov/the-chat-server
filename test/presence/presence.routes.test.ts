import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

type RegisteredUser = {
  id: string;
  accessToken: string;
};

type PresencePayload = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
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
    throw new Error(`Failed to register user: ${response.statusCode}`);
  }

  const body = response.json();
  return {
    id: body.data.user.id,
    accessToken: body.data.tokens.accessToken,
  };
}

async function waitForMyPresenceState(
  app: FastifyInstance,
  accessToken: string,
  isOnline: boolean,
): Promise<PresencePayload> {
  const timeoutMs = 2_000;
  const startedAt = Date.now();

  // Poll is used because websocket lifecycle updates happen asynchronously.
  while (Date.now() - startedAt < timeoutMs) {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/presence/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.statusCode === 200) {
      const payload = response.json().data as PresencePayload;
      if (payload.isOnline === isOnline) {
        return payload;
      }
    }

    await sleep(25);
  }

  throw new Error(`Presence did not reach expected isOnline=${String(isOnline)} state.`);
}

function connectSocket(url: string, accessToken?: string): Promise<WebSocket> {
  const headers = accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    socket.once("open", () => resolve(socket));
    socket.once("error", (error) => reject(error));
  });
}

function waitForSocketClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    socket.once("close", (code, reasonBuffer) => {
      resolve({
        code,
        reason: reasonBuffer.toString("utf8"),
      });
    });
  });
}

function waitForSocketMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve) => {
    socket.once("message", (payload) => {
      resolve(JSON.parse(payload.toString("utf8")));
    });
  });
}

describe("presence routes", () => {
  let app: FastifyInstance | undefined;
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    for (const socket of sockets) {
      try {
        socket.terminate();
      } catch {
        // no-op for already closed sockets
      }
    }
    sockets.length = 0;

    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("tracks online state for multiple websocket connections and transitions offline on last disconnect", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "presence_multi_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const firstSocket = await connectSocket(wsUrl, alice.accessToken);
    sockets.push(firstSocket);

    await waitForMyPresenceState(currentApp, alice.accessToken, true);

    const secondSocket = await connectSocket(wsUrl, alice.accessToken);
    sockets.push(secondSocket);

    await waitForMyPresenceState(currentApp, alice.accessToken, true);

    const firstClosed = waitForSocketClose(firstSocket);
    firstSocket.close();
    await firstClosed;

    await waitForMyPresenceState(currentApp, alice.accessToken, true);

    const secondClosed = waitForSocketClose(secondSocket);
    secondSocket.close();
    await secondClosed;

    const offlinePresence = await waitForMyPresenceState(
      currentApp,
      alice.accessToken,
      false,
    );
    expect(offlinePresence.lastSeenAt).toEqual(expect.any(String));
  });

  it("returns presence lookup for another user", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "presence_lookup_alice", "Alice");
    const bob = await registerUser(currentApp, "presence_lookup_bob", "Bob");

    const response = await currentApp.inject({
      method: "GET",
      url: `/api/v1/presence/users/${bob.id}`,
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        userId: bob.id,
        isOnline: false,
        lastSeenAt: null,
      },
    });
  });

  it("keeps idle websocket connection online via server heartbeat", async () => {
    const setup = await createTestApp({
      env: {
        PRESENCE_CONNECTION_TTL_SECONDS: "1",
        WS_HEARTBEAT_INTERVAL_MS: "200",
      },
    });
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "presence_idle_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const socket = await connectSocket(wsUrl, alice.accessToken);
    sockets.push(socket);

    await waitForMyPresenceState(currentApp, alice.accessToken, true);
    await sleep(1_500);

    const stillOnline = await waitForMyPresenceState(
      currentApp,
      alice.accessToken,
      true,
    );
    expect(stillOnline.isOnline).toBe(true);

    const closed = waitForSocketClose(socket);
    socket.close();
    await closed;

    const offline = await waitForMyPresenceState(currentApp, alice.accessToken, false);
    expect(offline.lastSeenAt).toEqual(expect.any(String));
  });

  it("keeps durable lastSeenAt useful when Redis presence TTL expires", async () => {
    const setup = await createTestApp({
      env: {
        PRESENCE_CONNECTION_TTL_SECONDS: "1",
        WS_HEARTBEAT_INTERVAL_MS: "10000",
      },
    });
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "presence_ttl_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws`;

    const socket = await connectSocket(wsUrl, alice.accessToken);
    sockets.push(socket);

    await waitForMyPresenceState(currentApp, alice.accessToken, true);
    await sleep(1_200);

    const expiredPresence = await waitForMyPresenceState(
      currentApp,
      alice.accessToken,
      false,
    );
    expect(expiredPresence.lastSeenAt).toEqual(expect.any(String));
  });

  it("rejects unauthenticated access to presence routes", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const response = await currentApp.inject({
      method: "GET",
      url: "/api/v1/presence/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("integrates authenticated websocket events with presence identity and rejects unauthenticated websocket", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;

    const alice = await registerUser(currentApp, "presence_ws_alice", "Alice");
    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");

    const authenticatedSocket = await connectSocket(`${wsBase}/ws`, alice.accessToken);
    sockets.push(authenticatedSocket);

    authenticatedSocket.send(
      JSON.stringify({
        type: "presence.subscribe",
      }),
    );

    const subscribedEvent = await waitForSocketMessage(authenticatedSocket);
    expect(subscribedEvent).toMatchObject({
      type: "presence.subscribed",
      userId: alice.id,
      isOnline: true,
    });

    const unauthenticatedSocket = await connectSocket(`${wsBase}/ws`);
    sockets.push(unauthenticatedSocket);
    const closed = await waitForSocketClose(unauthenticatedSocket);
    expect(closed.code).toBe(1008);
  });
});
