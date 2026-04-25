import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "../../shared/http/schemas";

export const PresenceSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  isOnline: Type.Boolean(),
  lastSeenAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
});

export const PresenceResponseSchema = Type.Object({
  data: PresenceSchema,
});

export const PresenceUserParamsSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

export const PresenceErrorResponseSchema = ErrorResponseSchema;
