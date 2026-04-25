import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { isValidJwtSubject, type JwtUserPayload } from "./jwt.types";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const authPlugin = fp(
  async (fastify) => {
    await fastify.register(jwt, {
      secret: fastify.config.jwtSecret,
    });

    fastify.decorate("authenticate", async (request, _reply) => {
      try {
        const payload = await request.jwtVerify<JwtUserPayload>();
        if (
          !payload ||
          payload.tokenType !== "access" ||
          !isValidJwtSubject(payload.sub)
        ) {
          throw new Error("Access token is required.");
        }
      } catch {
        throw new UnauthorizedError("Invalid or missing auth token.");
      }
    });
  },
  {
    name: "auth-plugin",
  },
);
