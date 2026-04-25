ALTER TABLE "messages"
  ADD COLUMN "client_message_id" varchar(128);

CREATE UNIQUE INDEX "messages_idempotency_unique_idx"
  ON "messages" ("chat_id", "sender_id", "client_message_id")
  WHERE "client_message_id" IS NOT NULL;
