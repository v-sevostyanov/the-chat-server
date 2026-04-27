import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import type { RagConfig } from "./types";

dotenv.config({ quiet: true });

const DEFAULT_QDRANT_URL = "http://127.0.0.1:6333";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_COLLECTION = "the_chat_server_code_rag";
const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_EMBEDDING_DIMENSIONS = 768;
const DEFAULT_MAX_FILE_BYTES = 262_144;

const envSchema = z.object({
  RAG_OLLAMA_URL: z.string().url().default(DEFAULT_OLLAMA_URL),
  RAG_QDRANT_URL: z.string().url().default(DEFAULT_QDRANT_URL),
  RAG_QDRANT_API_KEY: z.string().optional(),
  RAG_QDRANT_COLLECTION: z.string().min(1).default(DEFAULT_COLLECTION),
  RAG_EMBEDDING_MODEL: z.string().min(1).default(DEFAULT_EMBEDDING_MODEL),
  RAG_EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_EMBEDDING_DIMENSIONS),
  RAG_MAX_FILE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .default(DEFAULT_MAX_FILE_BYTES),
});

export function loadRagConfig(
  rawEnv: NodeJS.ProcessEnv = process.env,
  rootDir = process.cwd(),
): RagConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issue = parsed.error.issues
      .map((error) => `${error.path.join(".")}: ${error.message}`)
      .join("; ");
    throw new Error(`RAG environment validation failed: ${issue}`);
  }

  const qdrantApiKey = parsed.data.RAG_QDRANT_API_KEY?.trim();

  return {
    rootDir: path.resolve(rootDir),
    ollamaUrl: parsed.data.RAG_OLLAMA_URL,
    qdrantUrl: parsed.data.RAG_QDRANT_URL,
    qdrantApiKey: qdrantApiKey && qdrantApiKey.length > 0 ? qdrantApiKey : undefined,
    qdrantCollection: parsed.data.RAG_QDRANT_COLLECTION,
    embeddingModel: parsed.data.RAG_EMBEDDING_MODEL,
    embeddingDimensions: parsed.data.RAG_EMBEDDING_DIMENSIONS,
    maxFileBytes: parsed.data.RAG_MAX_FILE_BYTES,
  };
}
