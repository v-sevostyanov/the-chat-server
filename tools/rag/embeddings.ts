import type { EmbeddingsClient } from "./types";

const EMBEDDING_BATCH_SIZE = 64;

type OllamaEmbedResponse = {
  readonly embeddings?: unknown;
};

export class OllamaEmbeddingsClient implements EmbeddingsClient {
  readonly #baseUrl: string;
  readonly #model: string;
  readonly #dimensions: number;
  readonly #fetch: typeof fetch;

  constructor(options: {
    readonly baseUrl: string;
    readonly model: string;
    readonly dimensions: number;
    readonly fetchImpl?: typeof fetch;
  }) {
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#model = options.model;
    this.#dimensions = options.dimensions;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async embedTexts(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
    const vectors: Array<readonly number[]> = [];

    for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const response = await this.#embedBatch(batch);
      vectors.push(...response);
    }

    return vectors;
  }

  async #embedBatch(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}/api/embed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.#model,
          input: [...texts],
          truncate: false,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Ollama embeddings request failed: ${message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Ollama embeddings request failed with ${response.status}: ${body}`,
      );
    }

    const body = (await response.json()) as OllamaEmbedResponse;
    if (!Array.isArray(body.embeddings)) {
      throw new Error("Ollama embeddings response must include embeddings array.");
    }

    if (body.embeddings.length !== texts.length) {
      throw new Error("Ollama embeddings response returned unexpected vector count.");
    }

    return body.embeddings.map((embedding, index) =>
      this.#parseEmbedding(embedding, index),
    );
  }

  #parseEmbedding(embedding: unknown, index: number): readonly number[] {
    if (!Array.isArray(embedding)) {
      throw new Error(`Ollama embedding at index ${index} must be an array.`);
    }

    if (embedding.length !== this.#dimensions) {
      throw new Error(
        `Ollama embedding at index ${index} has ${embedding.length} dimensions, expected ${this.#dimensions}.`,
      );
    }

    return embedding.map((value, valueIndex) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          `Ollama embedding value at index ${index}.${valueIndex} must be a finite number.`,
        );
      }

      return value;
    });
  }
}
