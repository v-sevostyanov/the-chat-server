import { chunkSourceFile } from "./chunker";
import { discoverRagFiles } from "./file-discovery";
import type {
  EmbeddingsClient,
  RagDiscoveryResult,
  RagConfig,
  RagIndexResult,
  RagPoint,
  RagSearchResult,
  RagStatusResult,
  VectorStore,
} from "./types";

const UPSERT_BATCH_SIZE = 64;

type RagFileDiscoverer = (options: {
  readonly rootDir: string;
  readonly maxFileBytes: number;
}) => Promise<RagDiscoveryResult>;

export class RagService {
  readonly #config: RagConfig;
  readonly #embeddings: EmbeddingsClient;
  readonly #store: VectorStore;
  readonly #discoverFiles: RagFileDiscoverer;

  constructor(options: {
    readonly config: RagConfig;
    readonly embeddings: EmbeddingsClient;
    readonly store: VectorStore;
    readonly discoverFiles?: RagFileDiscoverer;
  }) {
    this.#config = options.config;
    this.#embeddings = options.embeddings;
    this.#store = options.store;
    this.#discoverFiles = options.discoverFiles ?? discoverRagFiles;
  }

  async indexRepository(): Promise<RagIndexResult> {
    const discovery = await this.#discoverFiles({
      rootDir: this.#config.rootDir,
      maxFileBytes: this.#config.maxFileBytes,
    });

    await this.#store.recreateCollection(this.#config.embeddingDimensions);

    let chunksCount = 0;
    let upserts = 0;

    for (const file of discovery.files) {
      const chunks = await chunkSourceFile(file);
      chunksCount += chunks.length;

      for (let offset = 0; offset < chunks.length; offset += UPSERT_BATCH_SIZE) {
        const batch = chunks.slice(offset, offset + UPSERT_BATCH_SIZE);
        const vectors = await this.#embeddings.embedTexts(
          batch.map((chunk) => chunk.chunkText),
        );
        if (vectors.length !== batch.length) {
          throw new Error("Embeddings client returned unexpected vector count.");
        }

        const points: RagPoint[] = batch.map((chunk, index) => ({
          id: chunk.id,
          vector: vectors[index],
          payload: {
            path: chunk.path,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            chunkText: chunk.chunkText,
            contentHash: chunk.contentHash,
          },
        }));

        upserts += await this.#store.upsert(points);
      }
    }

    return {
      files: discovery.files.length,
      chunks: chunksCount,
      upserts,
      skipped: discovery.skipped.length,
      skippedFiles: discovery.skipped,
    };
  }

  async search(input: {
    readonly query: string;
    readonly limit?: number;
  }): Promise<readonly RagSearchResult[]> {
    const query = input.query.trim();
    if (query.length === 0) {
      throw new Error("RAG search query cannot be empty.");
    }

    const limit = input.limit ?? 8;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new Error("RAG search limit must be an integer from 1 to 20.");
    }

    const [vector] = await this.#embeddings.embedTexts([query]);
    if (!vector) {
      throw new Error("Embeddings client returned no vector for search query.");
    }

    return this.#store.search(vector, limit);
  }

  async status(): Promise<RagStatusResult> {
    return this.#store.status(this.#config.embeddingDimensions);
  }
}
