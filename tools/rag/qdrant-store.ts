import { QdrantClient } from "@qdrant/js-client-rest";
import type { Schemas } from "@qdrant/js-client-rest";
import type {
  RagPoint,
  RagPointPayload,
  RagSearchResult,
  RagStatusResult,
  VectorStore,
} from "./types";

export class QdrantVectorStore implements VectorStore {
  readonly #client: QdrantClient;
  readonly #collection: string;
  readonly #qdrantUrl: string;

  constructor(options: {
    readonly url: string;
    readonly apiKey?: string;
    readonly collection: string;
  }) {
    this.#client = new QdrantClient({
      url: options.url,
      apiKey: options.apiKey,
    });
    this.#collection = options.collection;
    this.#qdrantUrl = options.url;
  }

  async recreateCollection(vectorSize: number): Promise<void> {
    const exists = await this.#client.collectionExists(this.#collection);
    if (exists.exists) {
      await this.#client.deleteCollection(this.#collection);
    }

    await this.#client.createCollection(this.#collection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });
  }

  async upsert(points: readonly RagPoint[]): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    await this.#client.upsert(this.#collection, {
      wait: true,
      points: points.map((point) => ({
        id: point.id,
        vector: [...point.vector],
        payload: {
          path: point.payload.path,
          startLine: point.payload.startLine,
          endLine: point.payload.endLine,
          chunkText: point.payload.chunkText,
          contentHash: point.payload.contentHash,
        },
      })),
    });

    return points.length;
  }

  async search(
    vector: readonly number[],
    limit: number,
  ): Promise<readonly RagSearchResult[]> {
    const results = await this.#client.search(this.#collection, {
      vector: [...vector],
      limit,
      with_payload: true,
      with_vector: false,
    });

    return results.map((result) => {
      const payload = parsePayload(result.payload);
      return {
        id: String(result.id),
        score: result.score,
        ...payload,
      };
    });
  }

  async status(vectorSize: number): Promise<RagStatusResult> {
    const exists = await this.#client.collectionExists(this.#collection);
    if (!exists.exists) {
      return {
        ok: false,
        collection: this.#collection,
        vectorSize,
        pointsCount: 0,
        qdrantUrl: this.#qdrantUrl,
      };
    }

    const count = await this.#client.count(this.#collection, { exact: true });

    return {
      ok: true,
      collection: this.#collection,
      vectorSize,
      pointsCount: count.count,
      qdrantUrl: this.#qdrantUrl,
    };
  }
}

function parsePayload(payload: Schemas["Payload"] | null | undefined): RagPointPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Qdrant point payload is missing.");
  }

  const path = getPayloadString(payload, "path");
  const chunkText = getPayloadString(payload, "chunkText");
  const contentHash = getPayloadString(payload, "contentHash");
  const startLine = getPayloadNumber(payload, "startLine");
  const endLine = getPayloadNumber(payload, "endLine");

  return {
    path,
    startLine,
    endLine,
    chunkText,
    contentHash,
  };
}

function getPayloadString(payload: Schemas["Payload"], key: string): string {
  const value = payload[key];
  if (typeof value !== "string") {
    throw new Error(`Qdrant payload field '${key}' must be a string.`);
  }

  return value;
}

function getPayloadNumber(payload: Schemas["Payload"], key: string): number {
  const value = payload[key];
  if (typeof value !== "number") {
    throw new Error(`Qdrant payload field '${key}' must be a number.`);
  }

  return value;
}
