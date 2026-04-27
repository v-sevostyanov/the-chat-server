import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { createRagService } from "./runtime";
import type { RagIndexResult, RagSearchResult, RagStatusResult } from "./types";

export const ragSearchInputShape = {
  query: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).optional(),
};

export const ragSearchInputSchema = z.object(ragSearchInputShape);

export function createRagMcpServer(): McpServer {
  const service = createRagService();
  const server = new McpServer({
    name: "the-chat-server-rag",
    version: "1.0.0",
  });

  server.registerTool(
    "rag_index",
    {
      title: "Index repository for RAG",
      description: "Rebuilds the Qdrant collection from git-visible project files.",
    },
    async () => toJsonToolResult(await service.indexRepository()),
  );

  server.registerTool(
    "rag_search",
    {
      title: "Search repository RAG context",
      description: "Returns ranked source snippets with path and line ranges.",
      inputSchema: ragSearchInputShape,
    },
    async (input: z.infer<typeof ragSearchInputSchema>) =>
      toJsonToolResult(await service.search(input)),
  );

  server.registerTool(
    "rag_status",
    {
      title: "Check RAG vector store status",
      description: "Checks Qdrant collection availability and point count.",
    },
    async () => toJsonToolResult(await service.status()),
  );

  return server;
}

async function main(): Promise<void> {
  const server = createRagMcpServer();
  await server.connect(new StdioServerTransport());
}

function toJsonToolResult(
  value: RagIndexResult | RagStatusResult | readonly RagSearchResult[],
) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
