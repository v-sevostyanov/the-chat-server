CREATE TABLE "user_credentials" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "user_credentials"
  ADD CONSTRAINT "user_credentials_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

CREATE TABLE "auth_refresh_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "refresh_token_hash" varchar(128) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "auth_refresh_sessions"
  ADD CONSTRAINT "auth_refresh_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

CREATE INDEX "auth_refresh_sessions_user_idx" ON "auth_refresh_sessions" ("user_id");
CREATE INDEX "auth_refresh_sessions_expiry_idx" ON "auth_refresh_sessions" ("expires_at");
