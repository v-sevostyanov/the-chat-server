import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/app/config";

describe("app config", () => {
  it("keeps production-only browser-facing features opt-in", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      JWT_SECRET: "production-secret-with-minimum-length",
    } as NodeJS.ProcessEnv);

    expect(config.swaggerEnabled).toBe(false);
    expect(config.trustProxy).toBe(false);
    expect(config.corsAllowedOrigins).toEqual([]);
  });

  it("normalizes explicit CORS origins", () => {
    const config = loadConfig({
      CORS_ALLOWED_ORIGINS:
        "https://app.example.com/path, http://localhost:5173, https://app.example.com",
    } as NodeJS.ProcessEnv);

    expect(config.corsAllowedOrigins).toEqual([
      "https://app.example.com",
      "http://localhost:5173",
    ]);
  });
});
