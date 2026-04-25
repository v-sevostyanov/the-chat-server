import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "../../shared/http/schemas";

export const ChatMemberSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  username: Type.String(),
  displayName: Type.String(),
  role: Type.String(),
  joinedAt: Type.String({ format: "date-time" }),
});

export const ChatSummarySchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  type: Type.Union([Type.Literal("direct"), Type.Literal("group")]),
  title: Type.Union([Type.String(), Type.Null()]),
  createdBy: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  membersCount: Type.Integer({ minimum: 0 }),
});

export const ChatDetailSchema = Type.Composite([
  ChatSummarySchema,
  Type.Object({
    members: Type.Array(ChatMemberSchema),
  }),
]);

export const CreateDirectChatBodySchema = Type.Object({
  targetUserId: Type.String({ format: "uuid" }),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
});

export const CreateGroupChatBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 128 }),
  participantUserIds: Type.Array(Type.String({ format: "uuid" }), {
    minItems: 1,
    maxItems: 50,
  }),
});

export const ListChatsQuerySchema = Type.Object({
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
});

export const ChatIdParamsSchema = Type.Object({
  chatId: Type.String({ format: "uuid" }),
});

export const ChatDetailResponseSchema = Type.Object({
  data: ChatDetailSchema,
});

export const ChatListResponseSchema = Type.Object({
  data: Type.Array(ChatSummarySchema),
});

export const ChatsErrorResponseSchema = ErrorResponseSchema;
