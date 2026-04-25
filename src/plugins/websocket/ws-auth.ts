import type { FastifyRequest } from "fastify";
import { isValidJwtSubject, type JwtUserPayload } from "../auth/jwt.types";

const MAX_TOKEN_LENGTH = 4096;

function sanitizeToken(rawToken: string | null): string | null {
  if (!rawToken) {
    return null;
  }

  const token = rawToken.trim();
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return null;
  }

  return token;
}

function extractAccessTokenFromQuery(request: FastifyRequest): string | null {
  const hostHeader = request.headers.host;
  const host = hostHeader && hostHeader.trim().length > 0 ? hostHeader : "localhost";

  let url: URL;
  try {
    url = new URL(request.url, `http://${host}`);
  } catch {
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      return null;
    }
  }

  const accessToken = sanitizeToken(url.searchParams.get("access_token"));
  if (accessToken) {
    return accessToken;
  }

  return sanitizeToken(url.searchParams.get("token"));
}

export function extractAccessToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    const token = sanitizeToken(authorization.slice("Bearer ".length));
    if (token) {
      return token;
    }
  }

  return extractAccessTokenFromQuery(request);
}

export async function resolveSocketUserId(
  request: FastifyRequest,
): Promise<string | null> {
  const token = extractAccessToken(request);
  if (!token) {
    return null;
  }

  try {
    const payload = await request.server.jwt.verify<JwtUserPayload>(token);
    if (
      !payload ||
      payload.tokenType !== "access" ||
      !isValidJwtSubject(payload.sub)
    ) {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}
