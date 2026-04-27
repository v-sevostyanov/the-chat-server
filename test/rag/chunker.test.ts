import { describe, expect, it } from "vitest";
import { chunkText } from "../../tools/rag/chunker";

describe("RAG chunker", () => {
  it("keeps stable line ranges and hashes", () => {
    const chunks = chunkText({
      path: "src/example.ts",
      text: "\nconst a = 1;\nconst b = 2;\n\nconst c = 3;\n",
      maxChunkChars: 28,
      overlapLines: 0,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      path: "src/example.ts",
      startLine: 2,
      endLine: 3,
      chunkText: "const a = 1;\nconst b = 2;",
    });
    expect(chunks[1]).toMatchObject({
      path: "src/example.ts",
      startLine: 5,
      endLine: 5,
      chunkText: "const c = 3;",
    });

    const repeated = chunkText({
      path: "src/example.ts",
      text: "\nconst a = 1;\nconst b = 2;\n\nconst c = 3;\n",
      maxChunkChars: 28,
      overlapLines: 0,
    });

    expect(repeated[0].id).toBe(chunks[0].id);
    expect(repeated[0].contentHash).toBe(chunks[0].contentHash);
  });
});
