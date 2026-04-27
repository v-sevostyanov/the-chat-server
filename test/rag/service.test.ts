import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RagService } from "../../tools/rag/service";
import type {
  EmbeddingsClient,
  RagPoint,
  RagSearchResult,
  RagStatusResult,
  VectorStore,
} from "../../tools/rag/types";

const tempDirs: string[] = [];

class FakeEmbeddingsClient implements EmbeddingsClient {
  async embedTexts(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
    return texts.map((text) => [text.length, text.includes("websocket") ? 1 : 0, 0]);
  }
}

class FakeVectorStore implements VectorStore {
  recreatedVectorSize: number | null = null;
  points: RagPoint[] = [];

  async recreateCollection(vectorSize: number): Promise<void> {
    this.recreatedVectorSize = vectorSize;
    this.points = [];
  }

  async upsert(points: readonly RagPoint[]): Promise<number> {
    this.points.push(...points);
    return points.length;
  }

  async search(
    _vector: readonly number[],
    limit: number,
  ): Promise<readonly RagSearchResult[]> {
    return this.points
      .map((point, index) => ({
        id: point.id,
        score: 1 - index / 10,
        path: point.payload.path,
        startLine: point.payload.startLine,
        endLine: point.payload.endLine,
        chunkText: point.payload.chunkText,
        contentHash: point.payload.contentHash,
      }))
      .slice(0, limit);
  }

  async status(vectorSize: number): Promise<RagStatusResult> {
    return {
      ok: true,
      collection: "test_collection",
      vectorSize,
      pointsCount: this.points.length,
      qdrantUrl: "memory",
    };
  }
}

describe("RagService", () => {
  afterEach(async () => {
    for (const tempDir of tempDirs.splice(0)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("indexes discovered files into vector store points", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "rag-service-"));
    tempDirs.push(rootDir);
    await writeFile(path.join(rootDir, "README.md"), "# Docs\nwebsocket auth\n");
    await writeFile(path.join(rootDir, ".env"), "SECRET=value\n");

    const store = new FakeVectorStore();
    const service = new RagService({
      config: {
        rootDir,
        ollamaUrl: "memory",
        qdrantUrl: "memory",
        qdrantCollection: "test_collection",
        embeddingModel: "fake",
        embeddingDimensions: 3,
        maxFileBytes: 1024,
      },
      embeddings: new FakeEmbeddingsClient(),
      store,
      discoverFiles: async () => ({
        files: [
          {
            path: "README.md",
            absolutePath: path.join(rootDir, "README.md"),
            sizeBytes: 22,
          },
        ],
        skipped: [{ path: ".env", reason: "env file" }],
      }),
    });

    const result = await service.indexRepository();

    expect(result.files).toBe(1);
    expect(result.chunks).toBe(1);
    expect(result.upserts).toBe(1);
    expect(result.skipped).toBe(1);
    expect(store.recreatedVectorSize).toBe(3);
    expect(store.points[0].payload).toMatchObject({
      path: "README.md",
      startLine: 1,
      endLine: 2,
    });
  });

  it("returns ranked search snippets with source metadata", async () => {
    const store = new FakeVectorStore();
    store.points = [
      {
        id: "9f29c46d-093e-495d-b184-93230b158d45",
        vector: [1, 0, 0],
        payload: {
          path: "docs/websocket.md",
          startLine: 10,
          endLine: 12,
          chunkText: "websocket auth details",
          contentHash: "hash",
        },
      },
    ];
    const service = new RagService({
      config: {
        rootDir: process.cwd(),
        ollamaUrl: "memory",
        qdrantUrl: "memory",
        qdrantCollection: "test_collection",
        embeddingModel: "fake",
        embeddingDimensions: 3,
        maxFileBytes: 1024,
      },
      embeddings: new FakeEmbeddingsClient(),
      store,
    });

    const result = await service.search({
      query: "websocket auth",
      limit: 1,
    });

    expect(result).toEqual([
      {
        id: "9f29c46d-093e-495d-b184-93230b158d45",
        score: 1,
        path: "docs/websocket.md",
        startLine: 10,
        endLine: 12,
        chunkText: "websocket auth details",
        contentHash: "hash",
      },
    ]);
  });

  it("rejects invalid search input", async () => {
    const service = new RagService({
      config: {
        rootDir: process.cwd(),
        ollamaUrl: "memory",
        qdrantUrl: "memory",
        qdrantCollection: "test_collection",
        embeddingModel: "fake",
        embeddingDimensions: 3,
        maxFileBytes: 1024,
      },
      embeddings: new FakeEmbeddingsClient(),
      store: new FakeVectorStore(),
    });

    await expect(service.search({ query: "   " })).rejects.toThrow(
      "RAG search query cannot be empty.",
    );
    await expect(service.search({ query: "auth", limit: 0 })).rejects.toThrow(
      "RAG search limit must be an integer from 1 to 20.",
    );
  });
});
