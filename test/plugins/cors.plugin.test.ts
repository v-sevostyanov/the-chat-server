import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

describe("cors plugin", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (!app) {
      return;
    }

    await app.close();
    app = undefined;
  });

  it("allows localhost origin", async () => {
    const setup = await createTestApp();
    app = setup.app;

    const response = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "http://localhost:5173",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows private network origin", async () => {
    const setup = await createTestApp();
    app = setup.app;

    const response = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "http://192.168.1.34:8080",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://192.168.1.34:8080",
    );
  });

  it("handles allowed preflight requests", async () => {
    const setup = await createTestApp();
    app = setup.app;

    const response = await app.inject({
      method: "OPTIONS",
      url: "/health/live",
      headers: {
        origin: "http://10.0.0.25:3000",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://10.0.0.25:3000",
    );
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
    expect(response.headers["access-control-allow-headers"]).toBe(
      "authorization,content-type",
    );
  });

  it("does not include CORS headers for non-local public origins", async () => {
    const setup = await createTestApp();
    app = setup.app;

    const response = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "https://example.com",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("uses explicit origin allowlist in production", async () => {
    const setup = await createTestApp({
      env: {
        NODE_ENV: "production",
        CORS_ALLOWED_ORIGINS: "https://app.example.com",
      },
    });
    app = setup.app;

    const allowedResponse = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "https://app.example.com",
      },
    });

    expect(allowedResponse.statusCode).toBe(200);
    expect(allowedResponse.headers["access-control-allow-origin"]).toBe(
      "https://app.example.com",
    );

    const privateNetworkResponse = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "http://192.168.1.34:8080",
      },
    });

    expect(privateNetworkResponse.statusCode).toBe(200);
    expect(
      privateNetworkResponse.headers["access-control-allow-origin"],
    ).toBeUndefined();
  });
});
