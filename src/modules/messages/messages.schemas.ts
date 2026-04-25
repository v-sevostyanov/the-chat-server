import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "../../shared/http/schemas";

export const MessageSenderSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  username: Type.String(),
  displayName: Type.String(),
});

export const MessageSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  chatId: Type.String({ format: "uuid" }),
  clientMessageId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  sender: MessageSenderSchema,
  body: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  editedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
});

export const MessageCursorSchema = Type.Object({
  beforeCreatedAt: Type.String({ format: "date-time" }),
  beforeMessageId: Type.String({ format: "uuid" }),
});

export const CreateMessageBodySchema = Type.Object({
  chatId: Type.String({ format: "uuid" }),
  clientMessageId: Type.Optional(Type.String({ format: "uuid" })),
  body: Type.String({ minLength: 1, maxLength: 4000 }),
});

export const ListChatMessagesParamsSchema = Type.Object({
  chatId: Type.String({ format: "uuid" }),
});

export const ListChatMessagesQuerySchema = Type.Object({
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
    }),
  ),
  beforeCreatedAt: Type.Optional(Type.String({ format: "date-time" })),
  beforeMessageId: Type.Optional(Type.String({ format: "uuid" })),
});

export const GetMessageByIdParamsSchema = Type.Object({
  messageId: Type.String({ format: "uuid" }),
});

export const MessageResponseSchema = Type.Object({
  data: MessageSchema,
});

export const MessageHistoryResponseSchema = Type.Object({
  data: Type.Array(MessageSchema),
  page: Type.Object({
    limit: Type.Integer({ minimum: 1 }),
    nextCursor: Type.Union([MessageCursorSchema, Type.Null()]),
  }),
});

export const MessagesErrorResponseSchema = ErrorResponseSchema;
