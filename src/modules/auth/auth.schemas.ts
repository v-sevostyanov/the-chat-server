import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "../../shared/http/schemas";

export const AuthUserSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    username: Type.String(),
    displayName: Type.String(),
  },
  {
    description: "Безопасные данные пользователя для auth-ответов.",
  },
);

export const AuthTokensSchema = Type.Object({
  accessToken: Type.String({ minLength: 1 }),
  refreshToken: Type.String({ minLength: 1 }),
  accessTokenExpiresIn: Type.Integer({ minimum: 1 }),
  refreshTokenExpiresIn: Type.Integer({ minimum: 1 }),
}, {
  description: "Выданная пара JWT-токенов и TTL metadata в секундах.",
});

export const AuthDataSchema = Type.Object({
  user: AuthUserSchema,
  tokens: AuthTokensSchema,
});

export const AuthResponseSchema = Type.Object(
  {
    data: AuthDataSchema,
  },
  {
    description: "Результат auth-операции с профилем пользователя и парой токенов.",
    examples: [
      {
        data: {
          user: {
            id: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
            username: "alice_1",
            displayName: "Alice",
          },
          tokens: {
            accessToken: "<jwt>",
            refreshToken: "<jwt>",
            accessTokenExpiresIn: 900,
            refreshTokenExpiresIn: 2592000,
          },
        },
      },
    ],
  },
);

export const SessionUserResponseSchema = Type.Object(
  {
    data: AuthUserSchema,
  },
  {
    description: "Текущий аутентифицированный пользователь.",
  },
);

export const RegisterBodySchema = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 32,
    pattern: "^[a-zA-Z0-9_]+$",
  }),
  displayName: Type.String({
    minLength: 1,
    maxLength: 64,
  }),
  password: Type.String({
    minLength: 8,
    maxLength: 128,
  }),
}, {
  description: "Payload для регистрации.",
  examples: [
    {
      username: "alice_1",
      displayName: "Alice",
      password: "super-secure-password",
    },
  ],
});

export const LoginBodySchema = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 32,
    pattern: "^[a-zA-Z0-9_]+$",
  }),
  password: Type.String({
    minLength: 8,
    maxLength: 128,
  }),
}, {
  description: "Payload для входа.",
  examples: [
    {
      username: "alice_1",
      password: "super-secure-password",
    },
  ],
});

export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String({ minLength: 1, maxLength: 4096 }),
}, {
  description: "Payload с refresh token для ротации токенов.",
  examples: [
    {
      refreshToken: "<refresh-jwt>",
    },
  ],
});

export const LogoutBodySchema = Type.Object({
  refreshToken: Type.String({ minLength: 1, maxLength: 4096 }),
}, {
  description: "Payload с refresh token для отзыва сессии.",
  examples: [
    {
      refreshToken: "<refresh-jwt>",
    },
  ],
});

export const LogoutResponseSchema = Type.Null({
  description: "Logout завершён. Сессия отозвана.",
});

export const AuthErrorResponseSchema = ErrorResponseSchema;
