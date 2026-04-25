import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { HealthHandlers } from "./health.handlers";

const LiveResponseSchema = Type.Object({
  status: Type.Literal("ok"),
  timestamp: Type.String({ format: "date-time" }),
});

const CheckSchema = Type.Object({
  name: Type.Union([Type.Literal("database"), Type.Literal("redis")]),
  status: Type.Union([Type.Literal("up"), Type.Literal("down")]),
  latencyMs: Type.Number(),
  error: Type.Optional(Type.String()),
});

const ReadinessResponseSchema = Type.Object({
  status: Type.Union([Type.Literal("ready"), Type.Literal("degraded")]),
  timestamp: Type.String({ format: "date-time" }),
  checks: Type.Array(CheckSchema),
});

type HealthRoutesOptions = {
  readonly handlers: HealthHandlers;
};

export const healthRoutes: FastifyPluginAsyncTypebox<HealthRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.get("/health", {
    schema: {
      tags: ["health"],
      summary: "Проверить liveness сервиса",
      description: "Лёгкий alias для проверки, что процесс сервиса жив.",
      response: {
        200: LiveResponseSchema,
      },
    },
    handler: options.handlers.live,
  });

  fastify.get("/health/live", {
    schema: {
      tags: ["health"],
      summary: "Проверить liveness процесса",
      description: "Возвращает состояние процесса без проверки внешних зависимостей.",
      response: {
        200: LiveResponseSchema,
      },
    },
    handler: options.handlers.live,
  });

  fastify.get("/health/ready", {
    schema: {
      tags: ["health"],
      summary: "Проверить readiness сервиса",
      description:
        "Проверяет готовность сервиса и критичных зависимостей: database и redis.",
      response: {
        200: ReadinessResponseSchema,
        503: ReadinessResponseSchema,
      },
    },
    handler: options.handlers.ready,
  });
};
