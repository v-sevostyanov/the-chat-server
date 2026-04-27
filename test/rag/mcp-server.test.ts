import { describe, expect, it } from "vitest";
import { ragSearchInputSchema } from "../../tools/rag/mcp-server";

describe("RAG MCP input validation", () => {
  it("rejects empty query and invalid limit", () => {
    expect(ragSearchInputSchema.safeParse({ query: "auth", limit: 8 }).success).toBe(
      true,
    );
    expect(ragSearchInputSchema.safeParse({ query: "   " }).success).toBe(false);
    expect(ragSearchInputSchema.safeParse({ query: "auth", limit: 0 }).success).toBe(
      false,
    );
    expect(
      ragSearchInputSchema.safeParse({ query: "auth", limit: 21 }).success,
    ).toBe(false);
  });
});
