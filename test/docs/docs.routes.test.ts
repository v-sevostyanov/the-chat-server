import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { createTestApp } from "../helpers/test-app";

type JsonSchemaObject = {
  readonly type?: string;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly allOf?: readonly unknown[];
  readonly properties?: Record<string, unknown>;
};

function expectObjectSchemaAllowsPayload(
  schema: JsonSchemaObject,
  payload: Record<string, unknown>,
): void {
  expect(schema.type).toBe("object");
  expect(schema.allOf).toBeUndefined();
  expect(schema.additionalProperties).toBe(false);

  for (const requiredKey of schema.required ?? []) {
    expect(payload).toHaveProperty(requiredKey);
  }

  for (const key of Object.keys(payload)) {
    expect(schema.properties?.[key]).toBeDefined();
  }
}

describe("docs plugin", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("serves combined REST and realtime docs when docs are enabled", async () => {
    const setup = await createTestApp({
      env: {
        SWAGGER_ENABLED: "true",
      },
    });
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const legacySpecResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/json",
    });

    expect(legacySpecResponse.statusCode).toBe(200);
    const spec = legacySpecResponse.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info).toMatchObject({
      title: packageJson.name,
      description:
        "Backend TheChat: REST API и realtime WebSocket API для чат-приложения.",
      version: packageJson.version,
    });
    expect(spec.paths["/api/v1/users"] ?? spec.paths["/api/v1/users/"]).toBeDefined();
    expect(spec.paths["/api/v1/auth/me"]).toBeDefined();
    expect(spec.paths["/ws"]).toBeUndefined();
    expect(spec.paths["/docs"]).toBeUndefined();
    expect(spec.paths["/docs/realtime"]).toBeUndefined();
    expect(spec.paths["/docs/asyncapi.json"]).toBeUndefined();
    expect(spec.paths["/api/v1/chats/_status"]).toBeUndefined();
    expect(spec.paths["/api/v1/messages/_status"]).toBeUndefined();
    expect(spec.paths["/api/v1/presence/_status"]).toBeUndefined();

    const openApiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/openapi.json",
    });
    expect(openApiResponse.statusCode).toBe(200);
    expect(openApiResponse.json().openapi).toBe(spec.openapi);

    const hubResponse = await currentApp.inject({
      method: "GET",
      url: "/docs",
    });

    expect(hubResponse.statusCode).toBe(200);
    expect(hubResponse.headers["content-type"]).toContain("text/html");
    expect(hubResponse.body).toContain("REST API");
    expect(hubResponse.body).toContain("WebSocket API");
    expect(hubResponse.body).toContain("Единая точка входа");
    expect(hubResponse.body).toContain("/docs/rest");
    expect(hubResponse.body).toContain("/docs/realtime");

    const restUiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/rest",
    });
    expect([200, 301, 302, 308]).toContain(restUiResponse.statusCode);

    const realtimeResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/realtime",
    });
    expect(realtimeResponse.statusCode).toBe(200);
    expect(realtimeResponse.headers["content-type"]).toContain("text/html");
    expect(realtimeResponse.body).toContain("chat.subscribe");
    expect(realtimeResponse.body).toContain("message.created");
    expect(realtimeResponse.body).toContain("best-effort");
    expect(realtimeResponse.body).toContain("Доставка и reconnect");

    const asyncApiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/asyncapi.json",
    });
    expect(asyncApiResponse.statusCode).toBe(200);
    const asyncApi = asyncApiResponse.json();
    expect(asyncApi.asyncapi).toMatch(/^2\./);
    expect(asyncApi.channels["/ws"]).toBeDefined();
    expect(asyncApi.components.messages.ChatSubscribe.name).toBe("chat.subscribe");
    expect(asyncApi.components.messages.ChatSubscribe.title).toBe(
      "Подписка на сообщения чата",
    );
    expect(asyncApi.components.messages.MessageCreated.name).toBe("message.created");
    expectObjectSchemaAllowsPayload(
      asyncApi.components.schemas.PresenceSubscribedEvent,
      {
        type: "presence.subscribed",
        userId: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
        isOnline: true,
        lastSeenAt: null,
      },
    );
    expectObjectSchemaAllowsPayload(
      asyncApi.components.schemas.PresenceUpdatedEvent,
      {
        type: "presence.updated",
        userId: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
        isOnline: false,
        lastSeenAt: "2026-04-07T13:25:30.000Z",
      },
    );

    const legacyRealtimeResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/websocket",
    });
    expect(legacyRealtimeResponse.statusCode).toBe(308);
    expect(legacyRealtimeResponse.headers.location).toBe("/docs/realtime");
  });

  it("does not expose docs routes when docs are disabled", async () => {
    const setup = await createTestApp({
      env: {
        SWAGGER_ENABLED: "false",
      },
    });
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const uiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs",
    });
    expect(uiResponse.statusCode).toBe(404);

    const specResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/json",
    });
    expect(specResponse.statusCode).toBe(404);

    const openApiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/openapi.json",
    });
    expect(openApiResponse.statusCode).toBe(404);

    const realtimeResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/realtime",
    });
    expect(realtimeResponse.statusCode).toBe(404);

    const asyncApiResponse = await currentApp.inject({
      method: "GET",
      url: "/docs/asyncapi.json",
    });
    expect(asyncApiResponse.statusCode).toBe(404);
  });
});
