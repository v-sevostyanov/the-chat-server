export type RagConfig = {
  readonly rootDir: string;
  readonly ollamaUrl: string;
  readonly qdrantUrl: string;
  readonly qdrantApiKey?: string;
  readonly qdrantCollection: string;
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly maxFileBytes: number;
};

export type RagSourceFile = {
  readonly path: string;
  readonly absolutePath: string;
  readonly sizeBytes: number;
};

export type RagSkippedFile = {
  readonly path: string;
  readonly reason: string;
};

export type RagDiscoveryResult = {
  readonly files: readonly RagSourceFile[];
  readonly skipped: readonly RagSkippedFile[];
};

export type RagChunk = {
  readonly id: string;
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly chunkText: string;
  readonly contentHash: string;
};

export type RagPoint = {
  readonly id: string;
  readonly vector: readonly number[];
  readonly payload: RagPointPayload;
};

export type RagPointPayload = {
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly chunkText: string;
  readonly contentHash: string;
};

export type RagSearchResult = {
  readonly id: string;
  readonly score: number;
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly chunkText: string;
  readonly contentHash: string;
};

export type RagIndexResult = {
  readonly files: number;
  readonly chunks: number;
  readonly upserts: number;
  readonly skipped: number;
  readonly skippedFiles: readonly RagSkippedFile[];
};

export type RagStatusResult = {
  readonly ok: boolean;
  readonly collection: string;
  readonly vectorSize: number;
  readonly pointsCount: number;
  readonly qdrantUrl: string;
};

export interface EmbeddingsClient {
  embedTexts(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface VectorStore {
  recreateCollection(vectorSize: number): Promise<void>;
  upsert(points: readonly RagPoint[]): Promise<number>;
  search(vector: readonly number[], limit: number): Promise<readonly RagSearchResult[]>;
  status(vectorSize: number): Promise<RagStatusResult>;
}
