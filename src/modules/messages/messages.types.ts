export type MessageSenderDto = {
  id: string;
  username: string;
  displayName: string;
};

export type MessageDto = {
  id: string;
  chatId: string;
  clientMessageId: string | null;
  sender: MessageSenderDto;
  body: string;
  createdAt: string;
  editedAt: string | null;
};

export type MessageHistoryCursor = {
  beforeCreatedAt: string;
  beforeMessageId: string;
};

export type MessageHistoryPageDto = {
  data: MessageDto[];
  page: {
    limit: number;
    nextCursor: MessageHistoryCursor | null;
  };
};

export type CreateMessageInput = {
  currentUserId: string;
  chatId: string;
  clientMessageId?: string;
  body: string;
};

export type CreateMessageResult = {
  message: MessageDto;
  recipientUserIds: string[];
  created: boolean;
};

export type ListChatMessagesInput = {
  currentUserId: string;
  chatId: string;
  limit: number;
  beforeCreatedAt?: string;
  beforeMessageId?: string;
};

export type GetMessageByIdInput = {
  currentUserId: string;
  messageId: string;
};
