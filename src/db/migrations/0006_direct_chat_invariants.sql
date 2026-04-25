UPDATE "chats"
SET
  "direct_user_low" = pairs."direct_user_low",
  "direct_user_high" = pairs."direct_user_high"
FROM (
  SELECT
    "chat_id",
    min("user_id"::text)::uuid AS "direct_user_low",
    max("user_id"::text)::uuid AS "direct_user_high",
    count(*) AS "member_count"
  FROM "chat_members"
  GROUP BY "chat_id"
) AS pairs
WHERE "chats"."id" = pairs."chat_id"
  AND "chats"."type" = 'direct'
  AND pairs."member_count" = 2
  AND (
    "chats"."direct_user_low" IS NULL
    OR "chats"."direct_user_high" IS NULL
  );

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_direct_user_low_users_id_fk"
  FOREIGN KEY ("direct_user_low")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_direct_user_high_users_id_fk"
  FOREIGN KEY ("direct_user_high")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_direct_pair_shape_check"
  CHECK (
    (
      "type" = 'direct'
      AND "direct_user_low" IS NOT NULL
      AND "direct_user_high" IS NOT NULL
      AND "direct_user_low" <> "direct_user_high"
    )
    OR
    (
      "type" = 'group'
      AND "direct_user_low" IS NULL
      AND "direct_user_high" IS NULL
    )
  );
