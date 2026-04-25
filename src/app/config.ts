import { z } from "zod";

const NODE_ENVS = ["development", "test", "production"] as const;
const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

function booleanFromString(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return defaultValue;
      }

      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }

      throw new Error("Expected 'true' or 'false'.");
    });
}

function parseCorsAllowedOrigins(rawValue: string): string[] {
  if (rawValue.trim().length === 0) {
    return [];
  }

  const origins = rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(`Invalid origin '${origin}'.`);
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`Origin '${origin}' must use http or https.`);
      }

      return parsed.origin;
    });

  return Array.from(new Set(origins));
}

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgres://postgres:postgres@127.0.0.1:5432/thechat"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  JWT_SECRET: z.string().min(16).default("development-only-secret-change-me"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .default(30 * 24 * 60 * 60),
  WS_PATH: z.string().min(1).default("/ws"),
  WS_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).default(64 * 1024),
  WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(100).default(30_000),
  WS_REALTIME_CHANNEL: z.string().min(1).default("thechat:realtime:events"),
  PRESENCE_CONNECTION_TTL_SECONDS: z.coerce.number().int().min(1).default(90),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  TRUST_PROXY: booleanFromString(false),
  SWAGGER_ENABLED: booleanFromString(false),
});

export type AppConfig = {
  readonly nodeEnv: (typeof NODE_ENVS)[number];
  readonly host: string;
  readonly port: number;
  readonly logLevel: (typeof LOG_LEVELS)[number];
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly jwtSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly websocketPath: string;
  readonly websocketMaxPayloadBytes: number;
  readonly websocketHeartbeatIntervalMs: number;
  readonly websocketRealtimeChannel: string;
  readonly presenceConnectionTtlSeconds: number;
  readonly corsAllowedOrigins: readonly string[];
  readonly trustProxy: boolean;
  readonly swaggerEnabled: boolean;
};

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issue = parsed.error.issues
      .map((error) => `${error.path.join(".")}: ${error.message}`)
      .join("; ");
    throw new Error(`Environment validation failed: ${issue}`);
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.JWT_SECRET === "development-only-secret-change-me"
  ) {
    throw new Error(
      "JWT_SECRET must be overridden in production environments.",
    );
  }

  let corsAllowedOrigins: string[];
  try {
    corsAllowedOrigins = parseCorsAllowedOrigins(
      parsed.data.CORS_ALLOWED_ORIGINS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Environment validation failed: CORS_ALLOWED_ORIGINS: ${message}`,
    );
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    databaseUrl: parsed.data.DATABASE_URL,
    redisUrl: parsed.data.REDIS_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    accessTokenTtlSeconds: parsed.data.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: parsed.data.REFRESH_TOKEN_TTL_SECONDS,
    websocketPath: parsed.data.WS_PATH,
    websocketMaxPayloadBytes: parsed.data.WS_MAX_PAYLOAD_BYTES,
    websocketHeartbeatIntervalMs: parsed.data.WS_HEARTBEAT_INTERVAL_MS,
    websocketRealtimeChannel: parsed.data.WS_REALTIME_CHANNEL,
    presenceConnectionTtlSeconds: parsed.data.PRESENCE_CONNECTION_TTL_SECONDS,
    corsAllowedOrigins,
    trustProxy: parsed.data.TRUST_PROXY,
    swaggerEnabled: parsed.data.SWAGGER_ENABLED,
  };
}
