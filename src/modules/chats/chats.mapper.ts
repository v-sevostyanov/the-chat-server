import type { ChatDetailDto, ChatMemberDto, ChatSummaryDto } from "./chats.types";

type ChatRow = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  createdBy: string | null;
  createdAt: Date | string;
  membersCount: number;
};

type ChatMemberRow = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  joinedAt: Date | string;
};

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
}

export function toChatSummaryDto(chat: ChatRow): ChatSummaryDto {
  return {
    id: chat.id,
    type: chat.type,
    title: chat.title,
    createdBy: chat.createdBy,
    createdAt: toIsoDate(chat.createdAt),
    membersCount: chat.membersCount,
  };
}

export function toChatMemberDto(member: ChatMemberRow): ChatMemberDto {
  return {
    userId: member.userId,
    username: member.username,
    displayName: member.displayName,
    role: member.role,
    joinedAt: toIsoDate(member.joinedAt),
  };
}

export function toChatDetailDto(
  chat: ChatRow,
  members: ChatMemberRow[],
): ChatDetailDto {
  return {
    ...toChatSummaryDto(chat),
    members: members.map(toChatMemberDto),
  };
}
