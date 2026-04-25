import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const chatType = pgEnum("chat_type", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey(),
    type: chatType("type").notNull(),
    title: varchar("title", { length: 128 }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    directUserLow: uuid("direct_user_low").references(() => users.id, {
      onDelete: "restrict",
    }),
    directUserHigh: uuid("direct_user_high").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    chatsCreatedByIdx: index("chats_created_by_idx").on(table.createdBy),
    chatsDirectPairUniqueIdx: uniqueIndex("chats_direct_pair_unique_idx")
      .on(table.directUserLow, table.directUserHigh)
      .where(sql`${table.type} = 'direct'`),
    chatsDirectPairLookupIdx: index("chats_direct_pair_lookup_idx").on(
      table.directUserLow,
      table.directUserHigh,
    ),
    chatsDirectPairShapeCheck: check(
      "chats_direct_pair_shape_check",
      sql`
        (
          ${table.type} = 'direct'
          and ${table.directUserLow} is not null
          and ${table.directUserHigh} is not null
          and ${table.directUserLow} <> ${table.directUserHigh}
        )
        or
        (
          ${table.type} = 'group'
          and ${table.directUserLow} is null
          and ${table.directUserHigh} is null
        )
      `,
    ),
  }),
);

export type ChatRow = typeof chats.$inferSelect;
