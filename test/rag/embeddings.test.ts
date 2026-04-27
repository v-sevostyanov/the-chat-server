import { describe, expect, it, vi } from "vitest";
import { OllamaEmbeddingsClient } from "../../tools/rag/embeddings";

describe("OllamaEmbeddingsClient", () => {
  it("requests batch embeddings and keeps response order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        embeddings: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      }),
    );
    const client = new OllamaEmbeddingsClient({
      baseUrl: "http://127.0.0.1:11434/",
      model: "nomic-embed-text",
      dimensions: 3,
      fetchImpl: fetchMock,
    });

    const result = await client.embedTexts(["first", "second"]);

    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:11434/api/embed", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text",
        input: ["first", "second"],
        truncate: false,
      }),
    });
  });

  it("throws a clear error when Ollama is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const client = createClient(fetchMock);

    await expect(client.embedTexts(["query"])).rejects.toThrow(
      "Ollama embeddings request failed: connect ECONNREFUSED",
    );
  });

  it("rejects response without embeddings array", async () => {
    const client = createClient(vi.fn().mockResolvedValue(jsonResponse({})));

    await expect(client.embedTexts(["query"])).rejects.toThrow(
      "Ollama embeddings response must include embeddings array.",
    );
  });

  it("rejects unexpected vector count", async () => {
    const client = createClient(
      vi.fn().mockResolvedValue(
        jsonResponse({
          embeddings: [[1, 2, 3]],
        }),
      ),
    );

    await expect(client.embedTexts(["first", "second"])).rejects.toThrow(
      "Ollama embeddings response returned unexpected vector count.",
    );
  });

  it("rejects unexpected vector dimensions", async () => {
    const client = createClient(
      vi.fn().mockResolvedValue(
        jsonResponse({
          embeddings: [[1, 2]],
        }),
      ),
    );

    await expect(client.embedTexts(["query"])).rejects.toThrow(
      "Ollama embedding at index 0 has 2 dimensions, expected 3.",
    );
  });
});

function createClient(fetchImpl: typeof fetch): OllamaEmbeddingsClient {
  return new OllamaEmbeddingsClient({
    baseUrl: "http://127.0.0.1:11434",
    model: "nomic-embed-text",
    dimensions: 3,
    fetchImpl,
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
