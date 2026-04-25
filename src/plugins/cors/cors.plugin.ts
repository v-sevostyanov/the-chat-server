import { isIP } from "node:net";
import fp from "fastify-plugin";
import type { AppConfig } from "../../app/config";

const ALLOWED_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Authorization,Content-Type";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().split("%")[0];

  if (normalized === "::1") {
    return true;
  }

  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isAllowedLocalNetworkOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return isPrivateIpv4(hostname);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(hostname);
  }

  if (hostname.endsWith(".local")) {
    return true;
  }

  return !hostname.includes(".");
}

function isAllowedOrigin(origin: string, config: AppConfig): boolean {
  if (config.corsAllowedOrigins.includes(origin)) {
    return true;
  }

  if (config.nodeEnv === "production") {
    return false;
  }

  return isAllowedLocalNetworkOrigin(origin);
}

export const corsPlugin = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request, reply) => {
      const origin = request.headers.origin;
      if (!origin || !isAllowedOrigin(origin, fastify.config)) {
        return;
      }

      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", ALLOWED_METHODS);

      const requestedHeaders = request.headers["access-control-request-headers"];
      reply.header(
        "Access-Control-Allow-Headers",
        requestedHeaders ?? DEFAULT_ALLOWED_HEADERS,
      );

      if (request.method === "OPTIONS") {
        reply.code(204).send();
      }
    });
  },
  {
    name: "cors-plugin",
  },
);
