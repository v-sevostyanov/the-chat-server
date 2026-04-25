import type {
  MessageDto,
  MessageHistoryCursor,
  MessageHistoryPageDto,
} from "./messages.types";

type MessageRow = {
  id: string;
  chatId: string;
  clientMessageId: string | null;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  body: string;
  createdAt: Date | string;
  editedAt: Date | string | null;
};

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
}

export function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    chatId: row.chatId,
    clientMessageId: row.clientMessageId,
    sender: {
      id: row.senderId,
      username: row.senderUsername,
      displayName: row.senderDisplayName,
    },
    body: row.body,
    createdAt: toIsoDate(row.createdAt),
    editedAt: row.editedAt ? toIsoDate(row.editedAt) : null,
  };
}

export function toMessageHistoryPageDto(
  rows: MessageRow[],
  limit: number,
): MessageHistoryPageDto {
  const data = rows.map(toMessageDto);
  const tail = data[data.length - 1];

  const nextCursor: MessageHistoryCursor | null =
    rows.length === limit && tail
      ? {
          beforeCreatedAt: tail.createdAt,
          beforeMessageId: tail.id,
        }
      : null;

  return {
    data,
    page: {
      limit,
      nextCursor,
    },
  };
}
