import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { users } from "./users";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    clientMessageId: varchar("client_message_id", { length: 128 }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => ({
    messagesChatCreatedAtIdx: index("messages_chat_created_at_idx").on(
      table.chatId,
      table.createdAt,
    ),
    messagesSenderIdx: index("messages_sender_idx").on(table.senderId),
    messagesIdempotencyUniqueIdx: uniqueIndex(
      "messages_idempotency_unique_idx",
    )
      .on(table.chatId, table.senderId, table.clientMessageId)
      .where(sql`${table.clientMessageId} is not null`),
  }),
);
