CREATE TYPE "chat_type" AS ENUM ('direct', 'group');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "username" varchar(32) NOT NULL UNIQUE,
  "display_name" varchar(64) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "chats" (
  "id" uuid PRIMARY KEY NOT NULL,
  "type" "chat_type" NOT NULL,
  "title" varchar(128),
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "chat_members" (
  "chat_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(16) DEFAULT 'member' NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "chat_members_pk" PRIMARY KEY ("chat_id", "user_id")
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "chat_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "edited_at" timestamptz
);

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_created_by_users_id_fk"
  FOREIGN KEY ("created_by")
  REFERENCES "users"("id")
  ON DELETE SET NULL;

ALTER TABLE "chat_members"
  ADD CONSTRAINT "chat_members_chat_id_chats_id_fk"
  FOREIGN KEY ("chat_id")
  REFERENCES "chats"("id")
  ON DELETE CASCADE;

ALTER TABLE "chat_members"
  ADD CONSTRAINT "chat_members_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_chat_id_chats_id_fk"
  FOREIGN KEY ("chat_id")
  REFERENCES "chats"("id")
  ON DELETE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

CREATE INDEX "chats_created_by_idx" ON "chats" ("created_by");
CREATE INDEX "chat_members_user_idx" ON "chat_members" ("user_id");
CREATE INDEX "messages_chat_created_at_idx" ON "messages" ("chat_id", "created_at");
CREATE INDEX "messages_sender_idx" ON "messages" ("sender_id");
