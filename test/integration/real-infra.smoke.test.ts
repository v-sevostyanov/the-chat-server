import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import type { RawData } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app/app";

type RegisteredUser = {
  id: string;
  accessToken: string;
};

type WsEvent = {
  type: string;
  [key: string]: unknown;
};

const describeRealInfra =
  process.env.RUN_REAL_INFRA_TESTS === "true" ? describe : describe.skip;

function buildInfraEnv(): NodeJS.ProcessEnv {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for real infra smoke tests.");
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required for real infra smoke tests.");
  }

  return {
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    JWT_SECRET: process.env.JWT_SECRET ?? "real-infra-test-secret-value",
    ACCESS_TOKEN_TTL_SECONDS: "900",
    REFRESH_TOKEN_TTL_SECONDS: "2592000",
    SWAGGER_ENABLED: "false",
    WS_PATH: "/ws",
    WS_MAX_PAYLOAD_BYTES: "65536",
    WS_HEARTBEAT_INTERVAL_MS: "30000",
    WS_REALTIME_CHANNEL: `thechat:realtime:test:${randomUUID()}`,
    PRESENCE_CONNECTION_TTL_SECONDS: "90",
    CORS_ALLOWED_ORIGINS: "",
    TRUST_PROXY: "false",
    HOST: "127.0.0.1",
    PORT: "3000",
  };
}

function connectSocket(url: string, accessToken: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", (error) => reject(error));
  });
}

function waitForEvent(
  socket: WebSocket,
  matcher: (event: WsEvent) => boolean,
  timeoutMs = 4_000,
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

async function registerUser(
  app: FastifyInstance,
  username: string,
): Promise<RegisteredUser> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      username,
      displayName: username,
      password: "super-secure-password",
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register smoke user: ${response.statusCode}`);
  }

  const body = response.json();
  return {
    id: body.data.user.id,
    accessToken: body.data.tokens.accessToken,
  };
}

describeRealInfra("real PostgreSQL/Redis smoke", () => {
  let app: FastifyInstance | undefined;
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    for (const socket of sockets) {
      try {
        socket.terminate();
      } catch {
        // no-op для уже закрытого socket
      }
    }
    sockets.length = 0;

    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("checks readiness and realtime fan-out through real services", async () => {
    app = await buildApp({
      logger: false,
      env: buildInfraEnv(),
    });
    const currentApp = app;

    const readiness = await currentApp.inject({
      method: "GET",
      url: "/health/ready",
    });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toMatchObject({
      status: "ready",
      checks: [
        expect.objectContaining({ name: "database", status: "up" }),
        expect.objectContaining({ name: "redis", status: "up" }),
      ],
    });

    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const alice = await registerUser(currentApp, `infra_${suffix}_alice`);
    const bob = await registerUser(currentApp, `infra_${suffix}_bob`);

    const baseUrl = await currentApp.listen({ host: "127.0.0.1", port: 0 });
    const wsBase = baseUrl.replace("http", "ws");
    const bobSocket = await connectSocket(`${wsBase}/ws`, bob.accessToken);
    sockets.push(bobSocket);

    const chatCreatedPromise = waitForEvent(
      bobSocket,
      (event) => event.type === "chat.created",
    );
    const createChatResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/chats/direct",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        targetUserId: bob.id,
      },
    });
    expect(createChatResponse.statusCode).toBe(201);

    const chatCreated = await chatCreatedPromise;
    const chatId = (chatCreated.chat as { id: string }).id;
    expect(chatId).toBe(createChatResponse.json().data.id);

    const subscribedPromise = waitForEvent(
      bobSocket,
      (event) => event.type === "chat.subscribed" && event.chatId === chatId,
    );
    bobSocket.send(
      JSON.stringify({
        type: "chat.subscribe",
        chatId,
      }),
    );
    await subscribedPromise;

    const messageCreatedPromise = waitForEvent(
      bobSocket,
      (event) => event.type === "message.created" && event.chatId === chatId,
    );
    const createMessageResponse = await currentApp.inject({
      method: "POST",
      url: "/api/v1/messages",
      headers: {
        authorization: `Bearer ${alice.accessToken}`,
      },
      payload: {
        chatId,
        clientMessageId: randomUUID(),
        body: "real infra smoke",
      },
    });
    expect(createMessageResponse.statusCode).toBe(201);

    const messageCreated = await messageCreatedPromise;
    expect(messageCreated).toMatchObject({
      type: "message.created",
      chatId,
      message: {
        body: "real infra smoke",
      },
    });
  });
});
