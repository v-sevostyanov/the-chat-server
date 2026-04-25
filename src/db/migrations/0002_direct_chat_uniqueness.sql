ALTER TABLE "chats"
  ADD COLUMN "direct_user_low" uuid,
  ADD COLUMN "direct_user_high" uuid;

CREATE UNIQUE INDEX "chats_direct_pair_unique_idx"
  ON "chats" ("direct_user_low", "direct_user_high")
  WHERE "type" = 'direct';

CREATE INDEX "chats_direct_pair_lookup_idx"
  ON "chats" ("direct_user_low", "direct_user_high");
