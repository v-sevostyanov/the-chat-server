import { Type } from "@sinclair/typebox";

export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
}, {
  description: "Стандартная оболочка ответа с ошибкой.",
  examples: [
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
      },
    },
  ],
});
