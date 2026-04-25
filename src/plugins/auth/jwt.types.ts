import "@fastify/jwt";

export type JwtUserPayload = {
  sub: string;
  sid?: string;
  jti?: string;
  tokenType: "access" | "refresh";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidJwtSubject(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}
