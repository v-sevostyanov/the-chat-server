import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { extractAccessToken } from "../../src/plugins/websocket/ws-auth";

function buildRequest(input: {
  url: string;
  authorization?: string;
  host?: string;
}): FastifyRequest {
  return {
    url: input.url,
    headers: {
      ...(input.authorization
        ? { authorization: input.authorization }
        : {}),
      ...(input.host ? { host: input.host } : {}),
    },
  } as unknown as FastifyRequest;
}

describe("ws auth token extraction", () => {
  it("extracts access token from authorization header", () => {
    const request = buildRequest({
      url: "/ws",
      authorization: "Bearer header-token",
    });

    expect(extractAccessToken(request)).toBe("header-token");
  });

  it("extracts access token from query when header is absent", () => {
    const request = buildRequest({
      url: "/ws?access_token=query-token",
      host: "localhost:3000",
    });

    expect(extractAccessToken(request)).toBe("query-token");
  });

  it("supports legacy token query key", () => {
    const request = buildRequest({
      url: "/ws?token=legacy-token",
      host: "localhost:3000",
    });

    expect(extractAccessToken(request)).toBe("legacy-token");
  });

  it("does not throw for malformed host header", () => {
    const request = buildRequest({
      url: "/ws?access_token=query-token",
      host: "bad host value with spaces",
    });

    expect(() => extractAccessToken(request)).not.toThrow();
    expect(extractAccessToken(request)).toBe("query-token");
  });

  it("rejects oversized tokens from any transport", () => {
    const oversized = "a".repeat(4097);
    const headerRequest = buildRequest({
      url: "/ws",
      authorization: `Bearer ${oversized}`,
    });
    const queryRequest = buildRequest({
      url: `/ws?access_token=${oversized}`,
      host: "localhost:3000",
    });

    expect(extractAccessToken(headerRequest)).toBeNull();
    expect(extractAccessToken(queryRequest)).toBeNull();
  });
});
