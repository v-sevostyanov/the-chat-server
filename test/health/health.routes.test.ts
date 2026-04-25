import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { MockRedis, createTestApp } from "../helpers/test-app";

describe("health routes", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns liveness status", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const response = await currentApp.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
    });
  });

  it("returns base health status", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const response = await currentApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
    });
  });

  it("returns ready when dependencies are healthy", async () => {
    const setup = await createTestApp();
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const response = await currentApp.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready",
      checks: [
        expect.objectContaining({ name: "database", status: "up" }),
        expect.objectContaining({ name: "redis", status: "up" }),
      ],
    });
  });

  it("returns degraded when a dependency is failing", async () => {
    const setup = await createTestApp({
      redis: new MockRedis(true),
    });
    app = setup.app;
    const currentApp = app;
    if (!currentApp) {
      throw new Error("App was not initialized");
    }

    const response = await currentApp.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body).toMatchObject({
      status: "degraded",
      checks: [
        expect.objectContaining({ name: "database", status: "up" }),
        expect.objectContaining({ name: "redis", status: "down" }),
      ],
    });
    const redisCheck = body.checks.find(
      (check: { name: string }) => check.name === "redis",
    );
    expect(redisCheck.error).toBe("Dependency check failed.");
  });
});
