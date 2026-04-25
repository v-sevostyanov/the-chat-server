export type ChatMemberDto = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  joinedAt: string;
};

export type ChatSummaryDto = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  createdBy: string | null;
  createdAt: string;
  membersCount: number;
};

export type ChatDetailDto = ChatSummaryDto & {
  members: ChatMemberDto[];
};

export type CreateDirectChatInput = {
  currentUserId: string;
  targetUserId: string;
  title?: string;
};

export type CreateGroupChatInput = {
  currentUserId: string;
  title: string;
  participantUserIds: string[];
};

export type ListChatsInput = {
  currentUserId: string;
  limit: number;
  offset: number;
};

export type GetChatByIdInput = {
  currentUserId: string;
  chatId: string;
};
