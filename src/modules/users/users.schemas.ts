import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "../../shared/http/schemas";

export const UserSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  username: Type.String(),
  displayName: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
}, {
  description: "Публичные данные пользователя.",
  examples: [
    {
      id: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
      username: "alice_1",
      displayName: "Alice",
      createdAt: "2026-04-07T13:25:30.000Z",
      updatedAt: "2026-04-07T13:25:30.000Z",
    },
  ],
});

export const UpdateCurrentUserBodySchema = Type.Object({
  username: Type.Optional(
    Type.String({
      minLength: 3,
      maxLength: 32,
      pattern: "^[a-zA-Z0-9_]+$",
    }),
  ),
  displayName: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 64,
    }),
  ),
}, {
  description: "Payload запроса для обновления профиля текущего пользователя.",
  minProperties: 1,
  examples: [
    {
      username: "alice_1",
      displayName: "Alice",
    },
  ],
});

export const ListUsersQuerySchema = Type.Object({
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
    }),
  ),
  offset: Type.Optional(
    Type.Integer({
      minimum: 0,
    }),
  ),
  search: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 64,
    }),
  ),
}, {
  description: "Опциональные параметры пагинации и поиска.",
});

export const UserIdParamsSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

export const UserResponseSchema = Type.Object({
  data: UserSchema,
}, {
  description: "Профиль пользователя.",
  examples: [
    {
      data: {
        id: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
        username: "alice_1",
        displayName: "Alice",
        createdAt: "2026-04-07T13:25:30.000Z",
        updatedAt: "2026-04-07T13:25:30.000Z",
      },
    },
  ],
});

export const ListUsersResponseSchema = Type.Object({
  data: Type.Array(UserSchema),
}, {
  description: "Коллекция пользователей.",
  examples: [
    {
      data: [
        {
          id: "44f2de7a-ec4a-4fcb-9f13-f27a7595a6e4",
          username: "alice_1",
          displayName: "Alice",
          createdAt: "2026-04-07T13:25:30.000Z",
          updatedAt: "2026-04-07T13:25:30.000Z",
        },
      ],
    },
  ],
});

export const UsersErrorResponseSchema = ErrorResponseSchema;
